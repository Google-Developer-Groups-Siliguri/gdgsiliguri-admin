import { createHash } from "node:crypto";

import type {
  CommunityEvent,
  Edition,
  EditionSectionKey,
  Faq,
  LinkKey,
  Partner,
  Session,
  SessionType,
  SiteApp,
  SiteConfig,
  Speaker,
  Sponsor,
  TeamMember,
  Testimonial,
  Track,
} from "@/lib/schema/v2";
import { EDITION_SECTION_KEYS } from "@/lib/schema/v2";
import { cleanUrl } from "@/lib/schema/v2/convert";
import { slugify, uniqueSlug } from "@/lib/slug";
import { DEFAULT_TIME_ZONE, formatLegacyDate, isoInZone, parseLegacyDateTime, time12To24 } from "@/lib/time/tz";

import { LEGACY_SOCIAL, LEGACY_SPONSOR_TIERS } from "./format";
import type { EditionContent } from "./to-rtdb";

type Json = Record<string, unknown>;
type Node = { enabled?: boolean; data?: Json[] } & Json;

export type MigrationReport = {
  unmatchedSpeakers: { session: string; name: string }[];
  amPmAnomalies: { session: string; startTime: string; endTime: string; reason: string }[];
  cleanedUrls: { path: string; from: string; to: string }[];
  droppedEmpty: string[];
  generatedIds: { collection: string; id: string; from: string }[];
  collidedIds: { collection: string; base: string; id: string }[];
  notes: string[];
};

export type V2Data = {
  site: SiteConfig;
  siteApp: SiteApp;
  editions: Record<number, EditionContent>;
  team: TeamMember[];
  events: CommunityEvent[];
  testimonials: Testimonial[];
  faqs: Faq[];
  modules: [];
  report: MigrationReport;
};

type CarryOver = ("partners" | "faqs")[];

export type FromRtdbOptions =
  | {
      contentYear: number;
      activeYear: number;
      contentDate: string;
      contentVenue: Edition["venue"];
      carryOver: CarryOver;
      appSettings?: Partial<SiteApp>;
    }
  | { year: number; carryOver: "all"; appSettings?: Partial<SiteApp> };

export const DEFAULT_FROM_RTDB_OPTIONS = {
  contentYear: 2025,
  activeYear: 2026,
  contentDate: "2025-11-16",
  contentVenue: {
    name: "Royal Sarovar Portico",
    address: "Sevoke Rd, Ward 42, Siliguri, West Bengal",
    mapsUrl: "https://maps.app.goo.gl/jeWSeQYpZ3EV6gMJ8",
    embedUrl:
      "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3562.687240890537!2d88.43764057601207!3d26.75435496687695!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x39e44150e6d5341f%3A0x3e9ecf67ac12449c!2sROYAL%20SAROVAR%20PORTICO!5e0!3m2!1sen!2sin!4v1696924762817!5m2!1sen!2sin",
  },
  carryOver: ["partners", "faqs"],
} satisfies FromRtdbOptions;

const END_TIME = "17:30";
const TRACK_COLORS: Record<string, string> = { ai: "#4285F4", app: "#34A853", cloud: "#FBBC04", web: "#EA4335" };
const SOCIAL_KEYS = Object.fromEntries(LEGACY_SOCIAL.map(({ key, name }) => [name.toLowerCase(), key])) as Record<
  string,
  LinkKey
>;
SOCIAL_KEYS.x = "x";

class Context {
  report: MigrationReport = {
    unmatchedSpeakers: [],
    amPmAnomalies: [],
    cleanedUrls: [],
    droppedEmpty: [],
    generatedIds: [],
    collidedIds: [],
    notes: [],
  };
  private taken = new Map<string, Set<string>>();

  url(value: unknown, path: string): string | undefined {
    if (typeof value !== "string" || value.trim() === "") {
      if (value === "") this.report.droppedEmpty.push(path);
      return undefined;
    }
    const cleaned = cleanUrl(value);
    if (cleaned !== value) this.report.cleanedUrls.push({ path, from: value, to: cleaned });
    return cleaned;
  }

  text(value: unknown, path: string): string | undefined {
    if (typeof value !== "string") return undefined;
    const trimmed = value.trim();
    if (trimmed === "") {
      this.report.droppedEmpty.push(path);
      return undefined;
    }
    return trimmed;
  }

  slugId(collection: string, base: string): string {
    const taken = this.taken.get(collection) ?? new Set<string>();
    this.taken.set(collection, taken);
    const root = slugify(base) || "item";
    const id = uniqueSlug(base, taken);
    if (id !== root) this.report.collidedIds.push({ collection, base: root, id });
    taken.add(id);
    this.report.generatedIds.push({ collection, id, from: base });
    return id;
  }

  autoId(collection: string, seed: string): string {
    const digest = createHash("sha256").update(`${collection}\n${seed}`).digest("base64url").replace(/[-_]/g, "");
    const id = digest.slice(0, 20);
    this.report.generatedIds.push({ collection, id, from: seed.slice(0, 60) });
    return id;
  }
}

function list(node: unknown): Json[] {
  const data = (node as Node | undefined)?.data;
  return Array.isArray(data) ? data : [];
}

function enabled(node: unknown): boolean {
  return Boolean((node as Node | undefined)?.enabled);
}

function compact<T extends Json>(value: T): T {
  return Object.fromEntries(Object.entries(value).filter(([, entry]) => entry !== undefined)) as T;
}

function links(ctx: Context, item: Json, path: string): Speaker["links"] {
  const value = compact({
    github: ctx.url(item.githubURL, `${path}.githubURL`),
    linkedin: ctx.url(item.linkedInURL, `${path}.linkedInURL`),
    x: ctx.url(item.twitterURL, `${path}.twitterURL`),
  });
  return Object.keys(value).length ? value : undefined;
}

function media(ctx: Context, url: unknown, alt: string, path: string) {
  const cleaned = ctx.url(url, path);
  return cleaned ? { url: cleaned, alt } : undefined;
}

function levenshtein(a: string, b: string): number {
  const row = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let i = 1; i <= a.length; i += 1) {
    let previous = row[0];
    row[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const current = row[j];
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, previous + (a[i - 1] === b[j - 1] ? 0 : 1));
      previous = current;
    }
  }
  return row[b.length];
}

const normalizeName = (name: string) => name.toLowerCase().replace(/\s+/g, " ").trim();

function matchSpeaker(name: string, speakers: Speaker[]): Speaker | undefined {
  const wanted = normalizeName(name);
  return (
    speakers.find((speaker) => normalizeName(speaker.name) === wanted) ??
    speakers.find((speaker) => levenshtein(normalizeName(speaker.name), wanted) <= 2)
  );
}

export function sessionType(title: string): SessionType {
  if (/registration/i.test(title)) return "registration";
  if (/lunch|break|tea/i.test(title)) return "break";
  if (/panel/i.test(title)) return "panel";
  if (/keynote|end note|welcome/i.test(title)) return "keynote";
  return "talk";
}

function tracksFrom(ctx: Context, eventDetails: Json): Track[] {
  const frames = ((eventDetails.frames as Json | undefined)?.speakers ?? {}) as Json;
  return ["AI", "App", "Cloud", "Web"].map((label, index) => {
    const id = label.toLowerCase();
    const frame = media(ctx, frames[label], "", `eventDetails.frames.speakers.${label}`);
    return compact({ id, label, color: TRACK_COLORS[id], order: (index + 1) * 10, frame }) as Track;
  });
}

function speakersFrom(ctx: Context, node: unknown): Speaker[] {
  return list(node).map((item, index) => {
    const path = `speakers.data[${index}]`;
    const name = String(item.name ?? "").trim();
    const headline = ctx.text(item.description, `${path}.description`);
    const company = headline?.includes("@") ? headline.split("@").pop()!.trim() || undefined : undefined;
    const designation = String(item.designation ?? "").trim();
    return compact({
      id: ctx.slugId("speakers", name),
      name,
      headline,
      company,
      photo: { url: ctx.url(item.profilePictureURL, `${path}.profilePictureURL`) ?? "", alt: name },
      trackId: designation ? designation.toLowerCase() : undefined,
      links: links(ctx, item, path),
      order: (index + 1) * 10,
    }) as Speaker;
  });
}

function sessionsFrom(ctx: Context, node: unknown, date: string, zone: string, speakers: Speaker[]): Session[] {
  let latestStart = -1;
  return list(node).map((item, index) => {
    const title = String(item.title ?? "").trim();
    const startTime = String(item.startTime ?? "");
    const endTime = String(item.endTime ?? "");
    const start24 = time12To24(startTime);
    const end24 = time12To24(endTime);
    const startMinutes = Number(start24.slice(0, 2)) * 60 + Number(start24.slice(3));
    if (end24 < start24) {
      ctx.report.amPmAnomalies.push({ session: title, startTime, endTime, reason: "ends before it starts" });
    } else if (/^12:\d\d AM$/i.test(startTime) && startMinutes < latestStart) {
      ctx.report.amPmAnomalies.push({ session: title, startTime, endTime, reason: "12 AM after a later slot" });
    }
    latestStart = Math.max(latestStart, startMinutes);

    const names = String(item.subTitle ?? "").trim();
    const matched = names ? matchSpeaker(names, speakers) : undefined;
    const resolved = matched
      ? [matched]
      : names
          .split(/\s*(?:,|&|\band\b)\s*/i)
          .filter(Boolean)
          .map((name) => matchSpeaker(name, speakers))
          .filter((speaker): speaker is Speaker => Boolean(speaker));
    if (names && resolved.length === 0) ctx.report.unmatchedSpeakers.push({ session: title, name: names });

    return compact({
      id: ctx.slugId("sessions", `${title}-${start24.replace(":", "")}`),
      title,
      type: sessionType(title),
      startAt: isoInZone(date, start24, zone),
      endAt: isoInZone(date, end24, zone),
      trackId: resolved[0]?.trackId,
      speakerIds: resolved.map((speaker) => speaker.id),
      order: (index + 1) * 10,
    }) as Session;
  });
}

function sponsorsFrom(ctx: Context, node: unknown): Sponsor[] {
  const record = (node ?? {}) as Json;
  return LEGACY_SPONSOR_TIERS.flatMap((tier) =>
    (Array.isArray(record[tier]) ? (record[tier] as Json[]) : []).map((item, index) => {
      const name = String(item.sponsorName ?? "").trim();
      const path = `sponsors.${tier}[${index}]`;
      return compact({
        id: ctx.slugId("sponsors", name),
        name,
        tier,
        logo: { url: ctx.url(item.icon, `${path}.icon`) ?? "", alt: name },
        url: ctx.url(item.socialMediaLink, `${path}.socialMediaLink`),
        order: (index + 1) * 10,
      }) as Sponsor;
    }),
  );
}

function partnersFrom(ctx: Context, node: unknown): Partner[] {
  return list(node).map((item, index) => {
    const name = String(item.communityName ?? "").trim();
    const path = `communityPartners.data[${index}]`;
    return compact({
      id: ctx.slugId("partners", name),
      name,
      logo: { url: ctx.url(item.icon, `${path}.icon`) ?? "", alt: name },
      url: ctx.url(item.socialMediaLink, `${path}.socialMediaLink`),
      order: (index + 1) * 10,
    }) as Partner;
  });
}

function faqsFrom(ctx: Context, node: unknown, collection: string): Faq[] {
  return list(node).map((item, index) => ({
    id: ctx.autoId(collection, `${index}:${item.question}`),
    question: String(item.question ?? "").trim(),
    answer: String(item.answer ?? "").trim(),
    order: (index + 1) * 10,
  }));
}

function teamFrom(ctx: Context, node: unknown): TeamMember[] {
  return list(node).map((item, index) => {
    const name = String(item.name ?? "").trim();
    const path = `teams.data[${index}]`;
    return compact({
      id: ctx.slugId("team", name),
      name,
      role: String(item.designation ?? "").toLowerCase() === "organizer" ? "organizer" : "volunteer",
      headline: ctx.text(item.description, `${path}.description`),
      photo: { url: ctx.url(item.profilePictureURL, `${path}.profilePictureURL`) ?? "", alt: name },
      links: links(ctx, item, path),
      active: true,
      order: (index + 1) * 10,
    }) as TeamMember;
  });
}

export function editionFromLabel(label: string | undefined): number | undefined {
  if (!label) return undefined;
  const full = /\b(20\d{2})\b/.exec(label);
  if (full) return Number(full[1]);
  const short = /'(\d{2})\b/.exec(label);
  return short ? 2000 + Number(short[1]) : undefined;
}

function testimonialsFrom(ctx: Context, node: unknown): Testimonial[] {
  return list(node).map((item, index) => {
    const eventLabel = ctx.text(item.eventAttended, `feedbacks.data[${index}].eventAttended`);
    return compact({
      id: ctx.autoId("testimonials", `${index}:${item.name}:${item.feedbackTitle}`),
      name: String(item.name ?? "").trim(),
      title: String(item.feedbackTitle ?? "").trim(),
      body: String(item.feedbackDescription ?? "").trim(),
      eventLabel,
      edition: editionFromLabel(eventLabel),
      featured: true,
      order: (index + 1) * 10,
    }) as Testimonial;
  });
}

function eventsFrom(ctx: Context, node: unknown, zone: string): CommunityEvent[] {
  return list(node).flatMap((item, index) => {
    const path = `events.data[${index}]`;
    const title = String(item.name ?? "").trim();
    const date = String(item.eventDate ?? "");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      ctx.report.notes.push(`Skipped event "${title}": it has no valid eventDate.`);
      return [];
    }
    const closes = String(item.registrationDate ?? "");
    const registrationUrl = ctx.url(item.registrationLink, `${path}.registrationLink`);
    const registration = compact({
      url: registrationUrl,
      closesAt: /^\d{4}-\d{2}-\d{2}$/.test(closes) ? isoInZone(closes, "23:59", zone) : undefined,
    });
    const speakers = (Array.isArray(item.speakers) ? (item.speakers as Json[]) : []).map((speaker, position) =>
      compact({
        name: String(speaker.name ?? "").trim(),
        headline: ctx.text(speaker.description, `${path}.speakers[${position}].description`),
        photo: media(ctx, speaker.imageUrl, String(speaker.name ?? ""), `${path}.speakers[${position}].imageUrl`),
      }),
    );
    const id = typeof item.id === "string" && item.id ? item.id : ctx.slugId("events", title);
    return [
      compact({
        id,
        title,
        tagline: ctx.text(item.tagline, `${path}.tagline`),
        description: ctx.text(item.description, `${path}.description`),
        startAt: isoInZone(date, "10:00", zone),
        timeZone: zone,
        registration: Object.keys(registration).length ? registration : undefined,
        cover: media(ctx, item.coverImg, title, `${path}.coverImg`),
        thumbnail: media(ctx, item.thumbnail, "", `${path}.thumbnail`),
        speakers: speakers.length ? speakers : undefined,
      }) as CommunityEvent,
    ];
  });
}

function siteLinks(ctx: Context, eventDetails: Json): SiteConfig["links"] {
  const socials = Array.isArray(eventDetails.socialMediaLinks) ? (eventDetails.socialMediaLinks as Json[]) : [];
  return Object.fromEntries(
    socials.flatMap((social, index) => {
      const key = SOCIAL_KEYS[String(social.name ?? "").toLowerCase()];
      const url = ctx.url(social.url, `eventDetails.socialMediaLinks[${index}].url`);
      return key && url ? [[key, url]] : [];
    }),
  );
}

function eventMode(value: unknown): SiteConfig["eventMode"] {
  if (value === true) return "on";
  if (value === false) return "off";
  return "auto";
}

function venueFrom(ctx: Context, eventDetails: Json): Edition["venue"] {
  const venue = (eventDetails.eventVenue ?? {}) as Json;
  const name = String(venue.name ?? "").trim();
  const embed = ctx.url(venue.mapsURLweb, "eventDetails.eventVenue.mapsURLweb");
  return compact({
    name,
    mapsUrl: ctx.url(venue.mapsURL, "eventDetails.eventVenue.mapsURL"),
    embedUrl: embed?.match(/^https:\/\/www\.google\.com\/maps\/embed\?pb=[^"\s]+/)?.[0],
    image: media(ctx, venue.imageURL, name, "eventDetails.eventVenue.imageURL"),
  });
}

type EditionBase = Omit<Edition, "year" | "title" | "startAt" | "endAt" | "registration" | "venue" | "sections">;

function editionBase(ctx: Context, eventDetails: Json): EditionBase {
  const images = (eventDetails.bannerImages ?? {}) as Json;
  const long = media(ctx, images.long, "", "eventDetails.bannerImages.long");
  const badge = media(ctx, images.aisummit, "", "eventDetails.bannerImages.aisummit");
  const toggled = (node: unknown) => ((node as Node | undefined)?.data ?? []).map(String);
  return compact({
    theme: ctx.text(eventDetails.theme, "eventDetails.theme"),
    summary: String(eventDetails.bannerDescription ?? "").trim(),
    techStack: Array.isArray(eventDetails.techStack) ? (eventDetails.techStack as string[]) : undefined,
    timeZone: DEFAULT_TIME_ZONE,
    banner: compact({
      url: ctx.url(images.large, "eventDetails.bannerImages.large") ?? "",
      alt: "",
      variants: long ? { long } : undefined,
    }),
    badges: badge ? [badge] : undefined,
    perks: toggled(eventDetails.perks).length ? toggled(eventDetails.perks) : undefined,
    notes: toggled(eventDetails.pointsToNote).length ? toggled(eventDetails.pointsToNote) : undefined,
    tracks: tracksFrom(ctx, eventDetails),
  }) as EditionBase;
}

function sections(values: Partial<Record<EditionSectionKey, boolean>>): Edition["sections"] {
  return Object.fromEntries(EDITION_SECTION_KEYS.map((key) => [key, Boolean(values[key])])) as Edition["sections"];
}

function siteFrom(ctx: Context, root: Json, activeEdition: number): SiteConfig {
  const eventDetails = (root.eventDetails ?? {}) as Json;
  const home = (root.home ?? {}) as Json;
  return {
    schemaVersion: 2,
    name: "GDG Siliguri",
    description: String(eventDetails.communityDescription ?? "").trim(),
    email: String(eventDetails.communityEmail ?? "").trim(),
    joinUrl: ctx.url(eventDetails.communityJoinLink, "eventDetails.communityJoinLink") ?? "",
    links: siteLinks(ctx, eventDetails),
    activeEdition,
    eventMode: eventMode(eventDetails.eventMode),
    sections: {
      team: enabled(root.teams),
      events: enabled(root.events),
      testimonials: enabled(root.feedbacks),
      faqs: enabled(home.gdgFAQs),
      blogs: true,
      showcase: false,
      pastEditions: enabled(home.pastDevfests),
    },
  };
}

function siteAppFrom(overrides: Partial<SiteApp> = {}): SiteApp {
  return {
    schemaVersion: 2,
    minSupportedBuild: 0,
    latestBuild: 0,
    disabledModules: [],
    ...overrides,
    storeUrls: { android: "", ios: "", ...overrides.storeUrls },
  };
}

function pastHighlights(root: Json): Map<number, string> {
  const home = (root.home ?? {}) as Json;
  return new Map(
    list(home.pastDevfests).flatMap((item) => {
      const year = Number(item.year);
      const highlight = String(item.highlight ?? "").trim();
      return Number.isInteger(year) && highlight ? [[year, highlight] as const] : [];
    }),
  );
}

function singleEdition(ctx: Context, root: Json, year: number): EditionContent {
  const eventDetails = (root.eventDetails ?? {}) as Json;
  const start = parseLegacyDateTime(String(eventDetails.eventDateTime), DEFAULT_TIME_ZONE);
  const date = formatLegacyDate(start, DEFAULT_TIME_ZONE);
  const closes = eventDetails.registrationExpiryDateTime
    ? parseLegacyDateTime(String(eventDetails.registrationExpiryDateTime), DEFAULT_TIME_ZONE).toISOString()
    : undefined;
  const ticket = ctx.url(eventDetails.eventTicketURL, "eventDetails.eventTicketURL");
  const speakers = speakersFrom(ctx, root.speakers);
  const doc: Edition = {
    ...editionBase(ctx, eventDetails),
    year,
    title: `DevFest Siliguri ${year}`,
    highlight: pastHighlights(root).get(year),
    startAt: start.toISOString(),
    endAt: isoInZone(date, END_TIME),
    registration: compact({ url: ticket, closesAt: closes }),
    venue: venueFrom(ctx, eventDetails),
    sections: sections({
      schedule: enabled(root.schedule),
      speakers: enabled(root.speakers),
      sponsors: enabled(root.sponsors),
      partners: enabled(root.communityPartners),
      faqs: enabled(root.FAQs),
      perks: enabled(eventDetails.perks),
      notes: enabled(eventDetails.pointsToNote),
      registration: Boolean(ticket),
    }),
  };
  return {
    doc: compact(doc),
    speakers,
    sessions: sessionsFrom(ctx, root.schedule, date, DEFAULT_TIME_ZONE, speakers),
    sponsors: sponsorsFrom(ctx, root.sponsors),
    partners: partnersFrom(ctx, root.communityPartners),
    faqs: faqsFrom(ctx, root.FAQs, `editions/${year}/faqs`),
  };
}

function splitEditions(
  ctx: Context,
  root: Json,
  options: Exclude<FromRtdbOptions, { carryOver: "all" }>,
): Record<number, EditionContent> {
  const eventDetails = (root.eventDetails ?? {}) as Json;
  const highlights = pastHighlights(root);
  const { contentYear, activeYear, contentDate } = options;

  const speakers = speakersFrom(ctx, root.speakers);
  const sessions = sessionsFrom(ctx, root.schedule, contentDate, DEFAULT_TIME_ZONE, speakers);
  const sponsors = sponsorsFrom(ctx, root.sponsors);
  const partners = partnersFrom(ctx, root.communityPartners);
  const faqs = faqsFrom(ctx, root.FAQs, "editions/faqs");
  const base = editionBase(ctx, eventDetails);
  const { perks, notes, badges, ...pastBase } = base;

  const past: Edition = compact({
    ...pastBase,
    year: contentYear,
    title: `DevFest Siliguri ${contentYear}`,
    highlight: highlights.get(contentYear),
    startAt: isoInZone(contentDate, "08:00"),
    endAt: isoInZone(contentDate, END_TIME),
    registration: {},
    venue: options.contentVenue,
    sections: sections({
      schedule: sessions.length > 0,
      speakers: speakers.length > 0,
      sponsors: sponsors.length > 0,
      partners: partners.length > 0,
      faqs: faqs.length > 0,
    }),
  });

  const start = parseLegacyDateTime(String(eventDetails.eventDateTime), DEFAULT_TIME_ZONE);
  const activeDate = formatLegacyDate(start, DEFAULT_TIME_ZONE);
  const carry = new Set(options.carryOver);
  const active: Edition = compact({
    ...base,
    perks,
    notes,
    badges,
    year: activeYear,
    title: `DevFest Siliguri ${activeYear}`,
    highlight: highlights.get(activeYear),
    startAt: start.toISOString(),
    endAt: isoInZone(activeDate, END_TIME),
    registration: {},
    venue: venueFrom(ctx, eventDetails),
    sections: sections({
      partners: carry.has("partners") && enabled(root.communityPartners),
      faqs: carry.has("faqs") && enabled(root.FAQs),
      perks: enabled(eventDetails.perks),
      notes: enabled(eventDetails.pointsToNote),
    }),
  });

  ctx.report.notes.push(
    `DevFest ${contentYear}: ${sessions.length} sessions, ${speakers.length} speakers, ${sponsors.length} sponsors, ` +
      `${partners.length} partners and ${faqs.length} FAQs, on ${contentDate} at ${options.contentVenue.name}.`,
    `DevFest ${activeYear}: starts ${activeDate}; end time ${END_TIME} is a placeholder; registration is pending. ` +
      `Carried over from ${contentYear}: ${options.carryOver.join(", ") || "nothing"}.`,
  );
  if (!highlights.has(contentYear)) ctx.report.notes.push(`DevFest ${contentYear} has no archive highlight yet.`);

  return {
    [contentYear]: { doc: past, sessions, speakers, sponsors, partners, faqs },
    [activeYear]: {
      doc: active,
      sessions: [],
      speakers: [],
      sponsors: [],
      partners: carry.has("partners") ? partners : [],
      faqs: carry.has("faqs") ? faqs : [],
    },
  };
}

export function fromRtdb(root: Json, options: FromRtdbOptions = DEFAULT_FROM_RTDB_OPTIONS): V2Data {
  const ctx = new Context();
  const single = options.carryOver === "all";
  const activeEdition = "year" in options ? options.year : options.activeYear;
  const editions =
    "year" in options ? { [options.year]: singleEdition(ctx, root, options.year) } : splitEditions(ctx, root, options);
  const site = siteFrom(ctx, root, activeEdition);
  if (single && !root.home) ctx.report.notes.push("No home node: community FAQs are empty.");
  const home = (root.home ?? {}) as Json;
  return {
    site,
    siteApp: siteAppFrom(options.appSettings),
    editions,
    team: teamFrom(ctx, root.teams),
    events: eventsFrom(ctx, root.events, DEFAULT_TIME_ZONE),
    testimonials: testimonialsFrom(ctx, root.feedbacks),
    faqs: faqsFrom(ctx, home.gdgFAQs, "faqs"),
    modules: [],
    report: ctx.report,
  };
}
