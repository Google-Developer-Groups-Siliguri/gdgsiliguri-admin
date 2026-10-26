import { z } from "zod";

import {
  fields,
  HEX_COLOR_PATTERN,
  listOf,
  SESSION_LEVELS,
  SESSION_TYPES,
  SPONSOR_TIERS,
  uniqueIds,
  type Mode,
} from "./common";

export const EDITION_SECTION_KEYS = [
  "schedule",
  "speakers",
  "sponsors",
  "partners",
  "faqs",
  "perks",
  "notes",
  "registration",
] as const;
export type EditionSectionKey = (typeof EDITION_SECTION_KEYS)[number];

function after(a: string | undefined, b: string | undefined): boolean {
  return Boolean(a && b) && Date.parse(a!) > Date.parse(b!);
}

export function buildEdition(mode: Mode) {
  const f = fields(mode);

  const track = f.object({
    id: f.slug("Track id"),
    label: f.requiredText("Track name", 40),
    color: f.strict ? z.string().regex(HEX_COLOR_PATTERN, "Use a colour like #4285F4") : z.string().default("#4285F4"),
    frame: f.media("Frame").optional(),
    order: f.order(),
  });

  const sections = f.object(
    Object.fromEntries(EDITION_SECTION_KEYS.map((key) => [key, f.flag(false)])) as {
      [K in EditionSectionKey]: ReturnType<typeof f.flag>;
    },
  );

  const banner = f.media("Banner").extend({
    variants: f
      .object({ long: f.media("Long banner").optional(), square: f.media("Square banner").optional() })
      .optional(),
  });

  const editionBase = f.object({
    year: f.strict ? z.number().int().min(2000).max(2100) : z.number().default(new Date().getFullYear()),
    title: f.requiredText("Title", 120),
    theme: f.optionalText("Theme", 200),
    summary: f.requiredText("Summary", 2_000),
    highlight: f.optionalText("Highlight", 200),
    techStack: z.array(f.requiredText("Technology", 60)).optional(),
    timeZone: f.strict ? z.string().min(1) : z.string().default("Asia/Kolkata"),
    startAt: f.instant("Start"),
    endAt: f.instant("End"),
    registration: f
      .object({
        url: f.optionalUrl("The registration link"),
        opensAt: f.optionalInstant("Opens"),
        closesAt: f.optionalInstant("Closes"),
      })
      .default({}),
    venue: f.required(f.venue()),
    banner: f.required(banner),
    badges: z.array(f.media("Badge")).optional(),
    perks: z.array(f.requiredText("Perk", 300)).optional(),
    notes: z.array(f.requiredText("Note", 500)).optional(),
    tracks: z.array(track).default([]),
    speakerFrameDefault: f.media("Default frame").optional(),
    sections: sections.default(Object.fromEntries(EDITION_SECTION_KEYS.map((key) => [key, false])) as never),
    recap: f
      .object({
        attendees: f.count().optional(),
        sessions: f.count().optional(),
        photosUrl: f.optionalUrl("The photos link"),
        videoUrl: f.optionalUrl("The video link"),
      })
      .optional(),
    updatedAt: f.optionalInstant(),
  });

  const edition = editionBase.superRefine((value, context) => {
    if (!f.strict) return;
    if (!after(value.endAt, value.startAt)) {
      context.addIssue({ code: "custom", path: ["endAt"], message: "The event must end after it starts" });
    }
    if (after(value.registration.closesAt, value.endAt)) {
      context.addIssue({
        code: "custom",
        path: ["registration", "closesAt"],
        message: "Registration must close before the event ends",
      });
    }
    if (after(value.registration.opensAt, value.registration.closesAt)) {
      context.addIssue({
        code: "custom",
        path: ["registration", "opensAt"],
        message: "Registration must open before it closes",
      });
    }
    uniqueIds(value.tracks, context, ["tracks"]);
  });

  const sessionBase = f.object({
    id: f.slug("Session id"),
    title: f.requiredText("Title", 200),
    description: f.markdown("Description").optional(),
    type: f.enumOf(SESSION_TYPES, "Type"),
    startAt: f.instant("Start"),
    endAt: f.instant("End"),
    trackId: f.strict ? z.string().min(1).optional() : z.string().optional(),
    speakerIds: z.array(z.string()).default([]),
    room: f.optionalText("Room", 100),
    level: f.strict ? z.enum(SESSION_LEVELS).optional() : z.string().optional(),
    slidesUrl: f.optionalUrl("The slides link"),
    videoUrl: f.optionalUrl("The video link"),
    order: f.order(),
    updatedAt: f.optionalInstant(),
  });

  const session = sessionBase.superRefine((value, context) => {
    if (f.strict && !after(value.endAt, value.startAt)) {
      context.addIssue({ code: "custom", path: ["endAt"], message: "The session must end after it starts" });
    }
  });

  const speaker = f.object({
    id: f.slug("Speaker id"),
    name: f.requiredText("Name", 100),
    headline: f.requiredText("Headline", 200),
    company: f.optionalText("Company", 100),
    bio: f.markdown("Bio").optional(),
    photo: f.required(f.media("Photo", { altRequired: true })),
    trackId: f.strict ? z.string().min(1).optional() : z.string().optional(),
    links: f.links().optional(),
    order: f.order(),
    updatedAt: f.optionalInstant(),
  });

  const sponsor = f.object({
    id: f.slug("Sponsor id"),
    name: f.requiredText("Name", 100),
    tier: f.enumOf(SPONSOR_TIERS, "Tier"),
    logo: f.required(f.media("Logo", { altRequired: true })),
    url: f.optionalUrl("The website link"),
    order: f.order(),
    updatedAt: f.optionalInstant(),
  });

  const partner = f.object({
    id: f.slug("Partner id"),
    name: f.requiredText("Name", 100),
    logo: f.required(f.media("Logo", { altRequired: true })),
    url: f.optionalUrl("The website link"),
    order: f.order(),
    updatedAt: f.optionalInstant(),
  });

  const faq = f.object({
    id: f.docId(),
    question: f.requiredText("Question", 300),
    answer: f.requiredMarkdown("Answer"),
    order: f.order(),
    updatedAt: f.optionalInstant(),
  });

  return {
    track,
    editionBase,
    edition,
    sessionBase,
    session,
    speaker,
    sponsor,
    partner,
    faq,
    sessions: listOf(session, mode),
    speakers: listOf(speaker, mode),
    sponsors: listOf(sponsor, mode),
    partners: listOf(partner, mode),
    faqs: listOf(faq, mode),
  };
}
