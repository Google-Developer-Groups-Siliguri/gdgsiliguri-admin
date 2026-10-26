import { z } from "zod";

import { DATETIME_PATTERN, isValidDate, TIME_12H_PATTERN } from "@/lib/datetime";
import { isHttpsUrl } from "@/lib/url";

export type SchemaMode = "lenient" | "strict";

export const TEAM_DESIGNATIONS = ["Organizer", "Volunteer"] as const;
export const SPEAKER_TRACKS = ["AI", "App", "Cloud", "Web"] as const;
export const SPONSOR_TIERS = ["platinum", "gold", "silver"] as const;
export type SponsorTier = (typeof SPONSOR_TIERS)[number];

const URL_MESSAGE = "Must be a full https:// link";
const UNSAFE_URL_MESSAGE = "Links can't contain quotes or spaces";
export const MAPS_EMBED_PATTERN = /^https:\/\/www\.google\.com\/maps\/embed\?pb=[^"\s]+$/;

function isSafeUrl(value: string): boolean {
  return !/["\s]/.test(value);
}
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function fields(mode: SchemaMode) {
  const strict = mode === "strict";
  const text = () => z.string();
  const requiredText = (label = "This") =>
    strict ? z.string().refine((value) => value.trim() !== "", `${label} is required`) : z.string();
  const optionalUrl = () =>
    strict
      ? z
          .string()
          .refine(isSafeUrl, UNSAFE_URL_MESSAGE)
          .refine((value) => value === "" || isHttpsUrl(value), URL_MESSAGE)
      : z.string();
  const requiredUrl = (label = "This link") =>
    strict
      ? z
          .string()
          .refine((value) => value !== "", `${label} is required`)
          .refine(isSafeUrl, UNSAFE_URL_MESSAGE)
          .refine((value) => value === "" || isHttpsUrl(value), URL_MESSAGE)
      : z.string();
  const mapsEmbedUrl = () =>
    strict
      ? z
          .string()
          .refine(
            (value) => value === "" || MAPS_EMBED_PATTERN.test(value),
            "Paste only the https://www.google.com/maps/embed?pb=… link, not the whole iframe",
          )
      : z.string();
  const choice = <const T extends readonly [string, ...string[]]>(options: T, label: string) =>
    strict
      ? z.string().refine((value) => (options as readonly string[]).includes(value), {
          message: `${label} must be one of ${options.join(", ")}`,
        })
      : z.string();
  const time12 = () =>
    strict ? z.string().regex(TIME_12H_PATTERN, "Use hh:mm AM or hh:mm PM, for example 08:00 AM") : z.string();
  const dateTime = () => (strict ? z.string().regex(DATETIME_PATTERN, "Use YYYY-MM-DD HH:mm:ss.SSS") : z.string());
  const optionalDate = () =>
    strict ? z.string().refine((value) => value === "" || isValidDate(value), "Use a date as YYYY-MM-DD") : z.string();
  const minutes = () => (strict ? z.string().regex(/^\d+$/, "Must be a whole number") : z.string());
  return {
    text,
    requiredText,
    optionalUrl,
    requiredUrl,
    mapsEmbedUrl,
    choice,
    time12,
    dateTime,
    optionalDate,
    minutes,
  };
}

function enabledList<T extends z.ZodType>(item: T) {
  return z.looseObject({ enabled: z.boolean(), data: z.array(item).default([]) });
}

export function buildSchemas(mode: SchemaMode) {
  const f = fields(mode);

  const memberFields = {
    name: f.requiredText("Name"),
    description: f.text(),
    profilePictureURL: f.optionalUrl(),
    githubURL: f.optionalUrl(),
    linkedInURL: f.optionalUrl(),
    twitterURL: f.optionalUrl(),
  };
  const teamMember = z.looseObject({
    ...memberFields,
    designation: f.choice(TEAM_DESIGNATIONS, "Designation"),
  });
  const speaker = z.looseObject({
    ...memberFields,
    designation: f.choice(SPEAKER_TRACKS, "Track"),
  });
  const scheduleItem = z.looseObject({
    startTime: f.time12(),
    endTime: f.time12(),
    durationInMins: f.minutes(),
    timeZone: f.text(),
    title: f.requiredText("Title"),
    subTitle: f.text(),
    image: f.optionalUrl(),
  });
  const sponsor = z.looseObject({
    sponsorName: f.requiredText("Sponsor name"),
    icon: f.requiredUrl("Logo"),
    socialMediaLink: f.optionalUrl(),
  });
  const partner = z.looseObject({
    communityName: f.requiredText("Community name"),
    icon: f.requiredUrl("Logo"),
    socialMediaLink: f.optionalUrl(),
  });
  const faq = z.looseObject({
    question: f.requiredText("Question"),
    answer: f.requiredText("Answer"),
  });
  const feedback = z.looseObject({
    name: f.requiredText("Name"),
    eventAttended: f.text(),
    feedbackTitle: f.requiredText("Title"),
    feedbackDescription: f.requiredText("Review"),
  });
  const eventSpeaker = z.looseObject({
    name: f.requiredText("Name"),
    imageUrl: f.optionalUrl(),
    description: f.text(),
  });
  const communityEvent = z.looseObject({
    id: mode === "strict" ? z.string().regex(SLUG_PATTERN, "Use lowercase letters, numbers and hyphens") : z.string(),
    name: f.requiredText("Name"),
    tagline: f.text(),
    description: f.text(),
    thumbnail: f.optionalUrl(),
    coverImg: f.optionalUrl(),
    registrationDate: f.optionalDate(),
    eventDate: f.optionalDate(),
    registrationLink: f.optionalUrl(),
    speakers: z.array(eventSpeaker).default([]),
  });
  const socialLink = z.looseObject({
    name: f.requiredText("Name"),
    url: f.requiredUrl("Link"),
    image: f.optionalUrl(),
  });
  const toggledStrings = z.looseObject({
    enabled: z.boolean(),
    data: z.array(f.requiredText("Item")).default([]),
  });
  const eventDetails = z.looseObject({
    bannerDescription: f.text(),
    communityDescription: f.text(),
    communityEmail:
      mode === "strict"
        ? z.string().refine((value) => value === "" || z.email().safeParse(value).success, "Must be an email address")
        : z.string(),
    communityJoinLink: f.optionalUrl(),
    eventDateTime: f.dateTime(),
    registrationExpiryDateTime: f.dateTime(),
    eventMode: z.boolean().optional(),
    eventTicketURL: f.optionalUrl(),
    bannerImages: z.looseObject({
      large: f.optionalUrl(),
      long: f.optionalUrl(),
      medium: f.optionalUrl(),
      small: f.optionalUrl(),
      aisummit: f.optionalUrl().optional(),
    }),
    eventVenue: z.looseObject({
      name: f.text(),
      imageURL: f.optionalUrl(),
      mapsURL: f.optionalUrl(),
      mapsURLweb: f.mapsEmbedUrl(),
    }),
    frames: z.looseObject({
      speakers: z.looseObject({
        AI: f.optionalUrl(),
        App: f.optionalUrl(),
        Cloud: f.optionalUrl(),
        Web: f.optionalUrl(),
        default: f.optionalUrl(),
      }),
    }),
    perks: toggledStrings,
    pointsToNote: toggledStrings,
    socialMediaLinks: z.array(socialLink).default([]),
  });

  const uniqueIds = (events: { id: string }[], context: z.RefinementCtx) => {
    const seen = new Map<string, number>();
    events.forEach((event, index) => {
      const first = seen.get(event.id);
      if (first !== undefined) {
        context.addIssue({
          code: "custom",
          path: ["data", index, "id"],
          message: `This id is already used by event ${first + 1}`,
        });
      } else {
        seen.set(event.id, index);
      }
    });
  };

  return {
    items: {
      teamMember,
      speaker,
      scheduleItem,
      sponsor,
      partner,
      faq,
      feedback,
      communityEvent,
      eventSpeaker,
      socialLink,
    },
    sections: {
      eventDetails,
      schedule: enabledList(scheduleItem),
      speakers: enabledList(speaker),
      sponsors: z.looseObject({
        enabled: z.boolean(),
        platinum: z.array(sponsor).default([]),
        gold: z.array(sponsor).default([]),
        silver: z.array(sponsor).default([]),
      }),
      communityPartners: enabledList(partner),
      devfestFaqs: enabledList(faq),
      gdgFaqs: enabledList(faq),
      teams: enabledList(teamMember),
      feedbacks: enabledList(feedback),
      events: enabledList(communityEvent).superRefine((value, context) =>
        uniqueIds(value.data as { id: string }[], context),
      ),
    },
  };
}

export const lenientSchemas = buildSchemas("lenient");
export const strictSchemas = buildSchemas("strict");

type Sections = typeof lenientSchemas.sections;
type Items = typeof lenientSchemas.items;

export type SectionValues = { [K in keyof Sections]: z.output<Sections[K]> };
export type TeamMember = z.output<Items["teamMember"]>;
export type Speaker = z.output<Items["speaker"]>;
export type ScheduleItem = z.output<Items["scheduleItem"]>;
export type Sponsor = z.output<Items["sponsor"]>;
export type Partner = z.output<Items["partner"]>;
export type Faq = z.output<Items["faq"]>;
export type Feedback = z.output<Items["feedback"]>;
export type CommunityEvent = z.output<Items["communityEvent"]>;
export type EventSpeaker = z.output<Items["eventSpeaker"]>;
export type SocialLink = z.output<Items["socialLink"]>;
export type EventDetails = SectionValues["eventDetails"];
