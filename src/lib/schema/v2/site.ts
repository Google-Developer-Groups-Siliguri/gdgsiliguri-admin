import { z } from "zod";

import { EVENT_MODES, fields, type Mode } from "./common";

export const SITE_SECTION_KEYS = [
  "team",
  "events",
  "testimonials",
  "faqs",
  "blogs",
  "showcase",
  "pastEditions",
] as const;
export type SiteSectionKey = (typeof SITE_SECTION_KEYS)[number];

export function buildSite(mode: Mode) {
  const f = fields(mode);

  const sections = f.object(
    Object.fromEntries(SITE_SECTION_KEYS.map((key) => [key, f.flag(false)])) as {
      [K in SiteSectionKey]: ReturnType<typeof f.flag>;
    },
  );

  const siteConfig = f.object({
    schemaVersion: f.strict ? z.literal(2) : z.number().default(2),
    name: f.requiredText("Name", 100),
    tagline: f.optionalText("Tagline", 200),
    description: f.requiredText("Description", 2_000),
    email: f.strict ? z.email("Must be an email address") : z.string().default(""),
    joinUrl: f.url("The join link"),
    links: f.links().default({}),
    region: f.optionalText("Region", 200),
    appLinks: f
      .object({ android: f.optionalUrl("The Play Store link"), ios: f.optionalUrl("The App Store link") })
      .optional(),
    activeEdition: f.strict ? z.number().int().min(2000).max(2100) : z.number().default(new Date().getFullYear()),
    eventMode: f.enumOf(EVENT_MODES, "Event mode"),
    eventModeLeadDays: f.strict ? z.number().int().min(0).max(365).optional() : z.number().optional(),
    sections: sections.default(Object.fromEntries(SITE_SECTION_KEYS.map((key) => [key, false])) as never),
    updatedAt: f.optionalInstant(),
  });

  const siteAppBase = f.object({
    schemaVersion: f.strict ? z.literal(2) : z.number().default(2),
    minSupportedBuild: f.strict ? z.number().int().min(0) : z.number().default(0),
    latestBuild: f.strict ? z.number().int().min(0) : z.number().default(0),
    updateMessage: f.optionalText("Update message", 300),
    storeUrls: f.required(
      f.object({ android: f.url("The Play Store link"), ios: f.optionalUrl("The App Store link") }),
    ),
    disabledModules: z.array(f.strict ? z.string().min(1) : z.string()).default([]),
    maintenanceMessage: f.optionalText("Maintenance message", 300),
    updatedAt: f.optionalInstant(),
  });

  const siteApp = siteAppBase.superRefine((value, context) => {
    if (f.strict && value.minSupportedBuild > value.latestBuild) {
      context.addIssue({
        code: "custom",
        path: ["minSupportedBuild"],
        message: "The minimum supported build can't be higher than the latest build",
      });
    }
  });

  return { siteConfig, siteAppBase, siteApp };
}
