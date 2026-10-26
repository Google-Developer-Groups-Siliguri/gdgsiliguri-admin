import type {
  CommunityEvent,
  Edition,
  Faq,
  Partner,
  Session,
  SiteConfig,
  Speaker,
  Sponsor,
  TeamMember,
  Testimonial,
} from "@/lib/schema/v2";
import type { LegacyNode } from "@/lib/sections/registry";
import { toMillis } from "@/lib/time/tz";

import {
  formatLegacyDate,
  formatLegacyDateTime,
  formatLegacyTime,
  LEGACY_SOCIAL,
  LEGACY_SPONSOR_TIERS,
  LEGACY_TEAM_ROLES,
  LEGACY_TIME_ZONE_LABEL,
  LEGACY_TRACK_LABELS,
} from "./format";

type Json = Record<string, unknown>;

export type EditionContent = {
  doc: Edition;
  sessions: Session[];
  speakers: Speaker[];
  sponsors: Sponsor[];
  partners: Partner[];
  faqs: Faq[];
};

export type LegacySources = {
  site: SiteConfig;
  active: EditionContent;
  editions: Edition[];
  team: TeamMember[];
  testimonials: Testimonial[];
  faqs: Faq[];
  events: CommunityEvent[];
};

const byOrder = <T extends { order: number }>(items: T[]) => [...items].sort((a, b) => a.order - b.order);

export function sortSessions<T extends Pick<Session, "startAt" | "order">>(sessions: T[]): T[] {
  return [...sessions].sort((a, b) => toMillis(a.startAt) - toMillis(b.startAt) || a.order - b.order);
}

function listNode(enabled: boolean, data: Json[]): Json {
  return data.length ? { enabled, data } : { enabled: false };
}

function stringsNode(enabled: boolean, data: string[] | undefined): Json {
  return data?.length ? { enabled, data } : { enabled };
}

function eventModeFlag(site: SiteConfig): Json {
  if (site.eventMode === "on") return { eventMode: true };
  if (site.eventMode === "off") return { eventMode: false };
  return {};
}

function trackLabel(edition: Edition, trackId: string | undefined): string {
  return edition.tracks.find((track) => track.id === trackId)?.label ?? "";
}

export function eventDetailsNode(site: SiteConfig, edition: Edition): Json {
  const zone = edition.timeZone;
  const frames = Object.fromEntries(
    LEGACY_TRACK_LABELS.map((label) => [
      label,
      edition.tracks.find((track) => track.label === label)?.frame?.url ?? "",
    ]),
  );
  const socials = LEGACY_SOCIAL.filter(({ key }) => site.links[key]).map(({ key, name, image }) => ({
    name,
    url: site.links[key],
    image,
  }));
  return {
    bannerDescription: edition.summary,
    bannerImages: {
      large: edition.banner.url,
      long: edition.banner.variants?.long?.url ?? "",
      medium: "",
      small: "",
      ...(edition.badges?.length ? { aisummit: edition.badges[0].url } : {}),
    },
    communityDescription: site.description,
    communityEmail: site.email,
    communityJoinLink: site.joinUrl,
    eventDateTime: formatLegacyDateTime(edition.startAt, zone),
    registrationExpiryDateTime: formatLegacyDateTime(edition.registration.closesAt ?? edition.startAt, zone),
    eventTicketURL: edition.registration.url ?? "",
    ...eventModeFlag(site),
    eventVenue: {
      name: edition.venue.name,
      imageURL: edition.venue.image?.url ?? "",
      mapsURL: edition.venue.mapsUrl ?? "",
      mapsURLweb: edition.venue.embedUrl ?? "",
    },
    frames: { speakers: { ...frames, default: edition.speakerFrameDefault?.url ?? "" } },
    perks: stringsNode(edition.sections.perks, edition.perks),
    pointsToNote: stringsNode(edition.sections.notes, edition.notes),
    socialMediaLinks: socials,
    ...(edition.theme ? { theme: edition.theme } : {}),
    ...(edition.techStack?.length ? { techStack: edition.techStack } : {}),
  };
}

export function scheduleNode(edition: Edition, sessions: Session[], speakers: Speaker[]): Json {
  const zone = edition.timeZone;
  const people = new Map(speakers.map((speaker) => [speaker.id, speaker]));
  const data = sortSessions(sessions).map((session) => {
    const resolved = session.speakerIds.flatMap((id) => (people.has(id) ? [people.get(id)!] : []));
    return {
      startTime: formatLegacyTime(session.startAt, zone),
      endTime: formatLegacyTime(session.endAt, zone),
      durationInMins: String(Math.round((toMillis(session.endAt) - toMillis(session.startAt)) / 60_000)),
      timeZone: LEGACY_TIME_ZONE_LABEL,
      title: session.title,
      subTitle: resolved.map((speaker) => speaker.name).join(", "),
      image: resolved[0]?.photo.url ?? "",
    };
  });
  return listNode(edition.sections.schedule, data);
}

export function speakersNode(edition: Edition, speakers: Speaker[]): Json {
  const data = byOrder(speakers).map((speaker) => ({
    name: speaker.name,
    description: speaker.headline ?? "",
    designation: trackLabel(edition, speaker.trackId),
    profilePictureURL: speaker.photo.url,
    githubURL: speaker.links?.github ?? "",
    linkedInURL: speaker.links?.linkedin ?? "",
    twitterURL: speaker.links?.x ?? "",
  }));
  return listNode(edition.sections.speakers, data);
}

export function sponsorsNode(edition: Edition, sponsors: Sponsor[]): Json {
  const tiers = Object.fromEntries(
    LEGACY_SPONSOR_TIERS.map((tier) => [
      tier,
      byOrder(sponsors.filter((sponsor) => sponsor.tier === tier)).map((sponsor) => ({
        sponsorName: sponsor.name,
        icon: sponsor.logo.url,
        socialMediaLink: sponsor.url ?? "",
      })),
    ]).filter(([, items]) => items.length > 0),
  );
  return Object.keys(tiers).length ? { enabled: edition.sections.sponsors, ...tiers } : { enabled: false };
}

export function partnersNode(edition: Edition, partners: Partner[]): Json {
  const data = byOrder(partners).map((partner) => ({
    communityName: partner.name,
    icon: partner.logo.url,
    socialMediaLink: partner.url ?? "",
  }));
  return listNode(edition.sections.partners, data);
}

function faqData(faqs: Faq[]): Json[] {
  return byOrder(faqs).map((faq) => ({ question: faq.question, answer: faq.answer }));
}

export function devfestFaqsNode(edition: Edition, faqs: Faq[]): Json {
  return listNode(edition.sections.faqs, faqData(faqs));
}

export function gdgFaqsNode(site: SiteConfig, faqs: Faq[]): Json {
  return listNode(site.sections.faqs, faqData(faqs));
}

export function pastDevfestsNode(site: SiteConfig, editions: Edition[]): Json {
  const data = editions
    .filter((edition) => edition.year !== site.activeEdition)
    .sort((a, b) => b.year - a.year)
    .map((edition) => ({ year: String(edition.year), highlight: edition.highlight ?? "" }));
  return listNode(site.sections.pastEditions, data);
}

const ROLE_RANK: Record<string, number> = { organizer: 0, volunteer: 1 };

export function teamsNode(site: SiteConfig, team: TeamMember[]): Json {
  const data = team
    .filter((member) => member.active && member.role in LEGACY_TEAM_ROLES)
    .sort((a, b) => ROLE_RANK[a.role] - ROLE_RANK[b.role] || a.order - b.order)
    .map((member) => ({
      name: member.name,
      designation: LEGACY_TEAM_ROLES[member.role],
      description: member.headline ?? "",
      profilePictureURL: member.photo.url,
      githubURL: member.links?.github ?? "",
      linkedInURL: member.links?.linkedin ?? "",
      twitterURL: member.links?.x ?? "",
    }));
  return listNode(site.sections.team, data);
}

export function feedbacksNode(site: SiteConfig, testimonials: Testimonial[]): Json {
  const data = byOrder(testimonials.filter((testimonial) => testimonial.featured)).map((testimonial) => ({
    name: testimonial.name,
    feedbackTitle: testimonial.title,
    feedbackDescription: testimonial.body,
    eventAttended: testimonial.eventLabel ?? "",
  }));
  return listNode(site.sections.testimonials, data);
}

export function eventsNode(site: SiteConfig, events: CommunityEvent[]): Json {
  const data = [...events]
    .sort((a, b) => toMillis(a.startAt) - toMillis(b.startAt))
    .map((event) => {
      const speakers = (event.speakers ?? []).map((speaker) => ({
        name: speaker.name,
        imageUrl: speaker.photo?.url ?? "",
        description: speaker.headline ?? "",
      }));
      return {
        id: event.id,
        name: event.title,
        tagline: event.tagline ?? "",
        description: event.description ?? "",
        eventDate: formatLegacyDate(event.startAt, event.timeZone),
        registrationDate: event.registration?.closesAt
          ? formatLegacyDate(event.registration.closesAt, event.timeZone)
          : "",
        registrationLink: event.registration?.url ?? "",
        coverImg: event.cover?.url ?? "",
        thumbnail: event.thumbnail?.url ?? "",
        ...(speakers.length ? { speakers } : {}),
      };
    });
  return listNode(site.sections.events, data);
}

export function buildLegacyNode(path: LegacyNode, sources: LegacySources): Json {
  const { site, active } = sources;
  switch (path) {
    case "eventDetails":
      return eventDetailsNode(site, active.doc);
    case "schedule":
      return scheduleNode(active.doc, active.sessions, active.speakers);
    case "speakers":
      return speakersNode(active.doc, active.speakers);
    case "sponsors":
      return sponsorsNode(active.doc, active.sponsors);
    case "communityPartners":
      return partnersNode(active.doc, active.partners);
    case "FAQs":
      return devfestFaqsNode(active.doc, active.faqs);
    case "home/gdgFAQs":
      return gdgFaqsNode(site, sources.faqs);
    case "home/pastDevfests":
      return pastDevfestsNode(site, sources.editions);
    case "teams":
      return teamsNode(site, sources.team);
    case "feedbacks":
      return feedbacksNode(site, sources.testimonials);
    case "events":
      return eventsNode(site, sources.events);
  }
}

export function buildLegacyRoot(sources: LegacySources, paths: readonly LegacyNode[]): Record<string, Json> {
  return Object.fromEntries(paths.map((path) => [path, buildLegacyNode(path, sources)]));
}

export const DROPPED_SPONSOR_TIERS = ["bronze", "community", "venue", "media"] as const;
