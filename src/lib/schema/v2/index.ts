import type { z } from "zod";

import { buildCommunity } from "./community";
import type { Mode } from "./common";
import { buildEdition } from "./edition";
import { buildModules } from "./modules";
import { buildShowcase } from "./showcase";
import { buildSite } from "./site";

export const SCHEMA_VERSION = 2;

export function buildSchemas(mode: Mode) {
  return {
    ...buildSite(mode),
    ...buildEdition(mode),
    ...buildCommunity(mode),
    ...buildModules(mode),
    ...buildShowcase(mode),
  };
}

export const lenient = buildSchemas("lenient");
export const strict = buildSchemas("strict");

type Strict = typeof strict;

export type SiteConfig = z.output<Strict["siteConfig"]>;
export type SiteApp = z.output<Strict["siteApp"]>;
export type Edition = z.output<Strict["edition"]>;
export type Track = z.output<Strict["track"]>;
export type Session = z.output<Strict["session"]>;
export type Speaker = z.output<Strict["speaker"]>;
export type Sponsor = z.output<Strict["sponsor"]>;
export type Partner = z.output<Strict["partner"]>;
export type Faq = z.output<Strict["faq"]>;
export type TeamMember = z.output<Strict["teamMember"]>;
export type CommunityEvent = z.output<Strict["communityEvent"]>;
export type EventSpeaker = z.output<Strict["eventSpeaker"]>;
export type Testimonial = z.output<Strict["testimonial"]>;
export type Blog = z.output<Strict["blog"]>;
export type ShowcaseItem = z.output<Strict["showcaseItem"]>;
export type ShowcaseSubmission = z.output<Strict["showcaseSubmission"]>;
export type ModuleDoc = z.output<Strict["moduleDoc"]>;
export type CardItem = z.output<Strict["cardItem"]>;
export type GalleryItem = z.output<Strict["galleryItem"]>;
export type LinkItem = z.output<Strict["linkItem"]>;
export type ModuleItem = CardItem | GalleryItem | LinkItem;
export type Media = NonNullable<Edition["badges"]>[number];

export type { EditionBundle, EditionsBundle, HomeBundle } from "./bundles";
export * from "./common";
export { EDITION_SECTION_KEYS, type EditionSectionKey } from "./edition";
export { ITEM_MODULE_TYPES, isItemModule, SOURCE_KIND, type ItemModuleType } from "./modules";
export { SITE_SECTION_KEYS, type SiteSectionKey } from "./site";
