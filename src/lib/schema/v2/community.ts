import { z } from "zod";

import { fields, listOf, TEAM_ROLES, type Mode } from "./common";

export function buildCommunity(mode: Mode) {
  const f = fields(mode);

  const teamMember = f.object({
    id: f.slug("Member id"),
    name: f.requiredText("Name", 100),
    role: f.enumOf(TEAM_ROLES, "Role"),
    headline: f.optionalText("Headline", 200),
    photo: f.required(f.media("Photo", { altRequired: true })),
    links: f.links().optional(),
    editions: z.array(z.number().int()).optional(),
    active: f.flag(true),
    order: f.order(),
    updatedAt: f.optionalInstant(),
  });

  const eventSpeaker = f.object({
    name: f.requiredText("Speaker name", 100),
    headline: f.optionalText("Speaker headline", 200),
    photo: f.media("Speaker photo").optional(),
  });

  const communityEventBase = f.object({
    id: f.slug("Event id"),
    title: f.requiredText("Title", 200),
    tagline: f.optionalText("Tagline", 200),
    description: f.markdown("Description").optional(),
    startAt: f.instant("Start"),
    endAt: f.optionalInstant("End"),
    timeZone: f.strict ? z.string().min(1) : z.string().default("Asia/Kolkata"),
    venue: f.venue().optional(),
    online: z.boolean().optional(),
    registration: f
      .object({ url: f.optionalUrl("The registration link"), closesAt: f.optionalInstant("Registration close") })
      .optional(),
    cover: f.media("Cover").optional(),
    thumbnail: f.media("Thumbnail").optional(),
    speakers: z.array(eventSpeaker).optional(),
    tags: z.array(f.requiredText("Tag", 40)).optional(),
    updatedAt: f.optionalInstant(),
  });

  const communityEvent = communityEventBase.superRefine((value, context) => {
    if (f.strict && value.endAt && Date.parse(value.endAt) <= Date.parse(value.startAt)) {
      context.addIssue({ code: "custom", path: ["endAt"], message: "The event must end after it starts" });
    }
  });

  const testimonial = f.object({
    id: f.docId(),
    name: f.requiredText("Name", 100),
    title: f.requiredText("Title", 200),
    body: f.requiredMarkdown("Review"),
    eventLabel: f.optionalText("Event", 100),
    edition: z.number().int().optional(),
    photo: f.media("Photo").optional(),
    featured: f.flag(true),
    order: f.order(),
    updatedAt: f.optionalInstant(),
  });

  const blog = f.object({
    id: f.strict ? z.string().min(1).max(200) : z.string().default(""),
    title: f.requiredText("Title", 300),
    brief: f.strict ? z.string().trim().min(1).max(300) : z.string().default(""),
    url: f.url("The post link"),
    cover: f.media("Cover").optional(),
    author: f.required(f.object({ name: f.requiredText("Author", 100), photoUrl: f.optionalUrl("The author photo") })),
    publishedAt: f.instant("Published"),
    readMinutes: f.count().optional(),
    tags: z.array(z.string()).optional(),
    pinned: f.flag(false),
    source: f.strict ? z.literal("hashnode") : z.string().default("hashnode"),
    updatedAt: f.optionalInstant(),
  });

  return {
    teamMember,
    eventSpeaker,
    communityEventBase,
    communityEvent,
    testimonial,
    blog,
    team: listOf(teamMember, mode).superRefine((value, context) => {
      if (mode === "strict" && !value.items.some((member) => member.role === "organizer")) {
        context.addIssue({ code: "custom", path: ["items"], message: "The team needs at least one organizer" });
      }
    }),
    events: listOf(communityEvent, mode),
    testimonials: listOf(testimonial, mode),
  };
}
