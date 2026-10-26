import { z } from "zod";

import { fields, type Mode } from "./common";

export const SUBMISSION_STATUSES = ["pending", "approved", "rejected", "hidden"] as const;
export const SUBMISSION_SOURCES = ["google-form", "sheet-import", "admin"] as const;

export function buildShowcase(mode: Mode) {
  const f = fields(mode);

  const showcaseItem = f.object({
    id: f.docId(),
    title: f.requiredText("Title", 80),
    summary: f.requiredText("Summary", 280),
    body: f.markdown("Write-up").optional(),
    team: z
      .array(f.object({ name: f.requiredText("Team member", 100), links: f.links().optional() }))
      .min(f.strict ? 1 : 0, "Add at least one team member")
      .max(8),
    links: f
      .object({
        repo: f.optionalUrl("The repository link"),
        demo: f.optionalUrl("The demo link"),
        video: f.optionalUrl("The video link"),
      })
      .optional(),
    images: z
      .array(f.media("Screenshot", { altRequired: true }))
      .max(5)
      .optional(),
    tags: z.array(f.requiredText("Tag", 40)).optional(),
    edition: z.number().int().optional(),
    eventId: z.string().optional(),
    featured: f.flag(false),
    order: f.order(),
    updatedAt: f.optionalInstant(),
  });

  const showcaseSubmission = f.object({
    status: f.enumOf(SUBMISSION_STATUSES, "Status"),
    payload: showcaseItem.omit({ id: true, featured: true, order: true, updatedAt: true }),
    contact: f.object({ email: f.strict ? z.email() : z.string(), phone: z.string().optional() }).optional(),
    consent: z.boolean(),
    source: f.enumOf(SUBMISSION_SOURCES, "Source"),
    dedupeKey: z.string(),
    rawImageLinks: z.array(z.string()).default([]),
    submittedAt: f.instant("Submitted"),
    reviewedBy: z.string().optional(),
    reviewedAt: f.optionalInstant(),
    reviewNote: z.string().optional(),
    publishedId: z.string().optional(),
  });

  return { showcaseItem, showcaseSubmission };
}
