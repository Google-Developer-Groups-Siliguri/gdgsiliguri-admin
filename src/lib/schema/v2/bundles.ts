import { z } from "zod";

import { buildCommunity } from "./community";
import { buildEdition } from "./edition";
import { buildModules } from "./modules";
import { buildShowcase } from "./showcase";
import { buildSite } from "./site";

const strictSite = buildSite("strict");
const strictEdition = buildEdition("strict");
const strictCommunity = buildCommunity("strict");
const strictModules = buildModules("strict");
const strictShowcase = buildShowcase("strict");

const instant = z.iso.datetime({ offset: true });

const bundleMeta = {
  schemaVersion: z.literal(2),
  generatedAt: instant,
  sourceVersions: z.record(z.string(), z.number().int()),
};

const noUpdatedAt = { updatedAt: true } as const;

export const personRef = z.strictObject({
  id: z.string(),
  name: z.string(),
  headline: z.string().optional(),
  photo: strictEdition.speaker.shape.photo.optional(),
});

const anyModuleItem = z.union([
  strictModules.cardItem.omit(noUpdatedAt),
  strictModules.galleryItem.omit(noUpdatedAt),
  strictModules.linkItem.omit(noUpdatedAt),
]);

export const bundleModule = strictModules.moduleDocBase.omit(noUpdatedAt).extend({
  items: z.array(anyModuleItem).optional(),
});

const sponsor = strictEdition.sponsor.omit(noUpdatedAt);
const partner = strictEdition.partner.omit(noUpdatedAt);
const faq = strictEdition.faq.omit(noUpdatedAt);
const showcase = strictShowcase.showcaseItem.omit(noUpdatedAt);
const editionDoc = strictEdition.editionBase.omit(noUpdatedAt);

export const homeEdition = editionDoc.pick({
  year: true,
  title: true,
  theme: true,
  summary: true,
  timeZone: true,
  startAt: true,
  endAt: true,
  registration: true,
  venue: true,
  banner: true,
  badges: true,
  sections: true,
  tracks: true,
});

export const pastEdition = z.strictObject({
  year: z.number().int(),
  title: z.string(),
  highlight: z.string().optional(),
  banner: editionDoc.shape.banner,
  startAt: instant,
});

export const homeBundle = z.strictObject({
  ...bundleMeta,
  site: strictSite.siteConfig.omit(noUpdatedAt),
  edition: homeEdition,
  sponsors: z.array(sponsor),
  partners: z.array(partner),
  editionFaqs: z.array(faq),
  faqs: z.array(faq),
  testimonials: z.array(strictCommunity.testimonial.omit(noUpdatedAt)),
  team: z.array(strictCommunity.teamMember.omit(noUpdatedAt)),
  events: z.array(strictCommunity.communityEventBase.omit(noUpdatedAt)),
  blogs: z.array(strictCommunity.blog.omit(noUpdatedAt)),
  showcaseFeatured: z.array(showcase),
  modules: z.array(bundleModule),
  pastEditions: z.array(pastEdition),
});

export const editionBundle = z.strictObject({
  ...bundleMeta,
  edition: editionDoc,
  sessions: z.array(strictEdition.sessionBase.omit(noUpdatedAt).extend({ speakers: z.array(personRef) })),
  speakers: z.array(strictEdition.speaker.omit(noUpdatedAt).extend({ sessionIds: z.array(z.string()) })),
  sponsors: z.array(sponsor),
  partners: z.array(partner),
  faqs: z.array(faq),
  showcase: z.array(showcase),
  modules: z.array(bundleModule),
});

export const editionsBundle = z.strictObject({
  ...bundleMeta,
  items: z.array(
    z.strictObject({
      year: z.number().int(),
      title: z.string(),
      theme: z.string().optional(),
      highlight: z.string().optional(),
      startAt: instant,
      endAt: instant,
      banner: editionDoc.shape.banner,
      venueName: z.string(),
    }),
  ),
});

export type HomeBundle = z.output<typeof homeBundle>;
export type EditionBundle = z.output<typeof editionBundle>;
export type EditionsBundle = z.output<typeof editionsBundle>;
export type BundleModule = z.output<typeof bundleModule>;
export type PersonRef = z.output<typeof personRef>;
