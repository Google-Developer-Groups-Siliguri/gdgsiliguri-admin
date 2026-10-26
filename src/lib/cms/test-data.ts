import { readFileSync } from "node:fs";

import { DEFAULT_FROM_RTDB_OPTIONS, fromRtdb, type V2Data } from "@/lib/legacy/from-rtdb";
import type { Blog, ModuleDoc, ModuleItem, ShowcaseItem } from "@/lib/schema/v2";

import type { BundleReader } from "./bundles";

export const seed = JSON.parse(readFileSync(new URL("../../../seed/rtdb-export.json", import.meta.url), "utf8"));

export const TEST_APP_SETTINGS = {
  latestBuild: 4000,
  storeUrls: {
    android: "https://play.google.com/store/apps/details?id=com.amarjitmallick.gdg_siliguri",
    ios: "https://apps.apple.com/app/id0000000000",
  },
};

export function backfill(root: Record<string, unknown> = seed): V2Data {
  return fromRtdb(structuredClone(root), { ...DEFAULT_FROM_RTDB_OPTIONS, appSettings: TEST_APP_SETTINGS });
}

export type Extras = {
  blogs?: Blog[];
  showcase?: ShowcaseItem[];
  modules?: ModuleDoc[];
  moduleItems?: Record<string, ModuleItem[]>;
  versions?: Record<string, number>;
};

export function memoryReader(data: V2Data, extras: Extras = {}): BundleReader {
  return {
    site: async () => data.site,
    editions: async () => Object.values(data.editions).map((content) => content.doc),
    editionContent: async (year) => {
      const content = data.editions[year];
      if (!content) throw new Error(`No edition ${year}`);
      return content;
    },
    team: async () => data.team,
    events: async () => data.events,
    testimonials: async () => data.testimonials,
    faqs: async () => data.faqs,
    blogs: async () => extras.blogs ?? [],
    showcase: async () => extras.showcase ?? [],
    modules: async () => extras.modules ?? [],
    moduleItems: async (id) => extras.moduleItems?.[id] ?? [],
    sourceVersions: async () => extras.versions ?? {},
  };
}
