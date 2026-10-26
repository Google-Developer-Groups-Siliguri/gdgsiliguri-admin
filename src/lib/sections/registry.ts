import type { z } from "zod";

import { lenient, strict, type ItemModuleType, type ModuleDoc } from "@/lib/schema/v2";
import { isItemModule } from "@/lib/schema/v2/modules";

export const SECTION_ID_PATTERN =
  /^(site-config|site-app|edition-\d{4}(-(sessions|speakers|sponsors|partners|faqs))?|team|events|testimonials|faqs|modules|module-[a-z0-9-]+)$/;

export const LEGACY_NODES = [
  "eventDetails",
  "schedule",
  "speakers",
  "sponsors",
  "communityPartners",
  "FAQs",
  "home/gdgFAQs",
  "home/pastDevfests",
  "teams",
  "feedbacks",
  "events",
] as const;
export type LegacyNode = (typeof LEGACY_NODES)[number];

export const ALL_LEGACY_EDITION_NODES: LegacyNode[] = [
  "eventDetails",
  "schedule",
  "speakers",
  "sponsors",
  "communityPartners",
  "FAQs",
];

export type BundleId = "home" | "editions" | `edition-${number}`;
export type SectionKind = "singleton" | "list";
export type SectionGroup = "Site" | "DevFest" | "Community" | "Modules";
export type EditionCollection = "sessions" | "speakers" | "sponsors" | "partners" | "faqs";

export type SectionScope =
  { type: "site" } | { type: "edition"; year: number } | { type: "community" } | { type: "module"; moduleId?: string };

export type SingletonTarget = { type: "doc"; path: string };
export type ListTarget = { type: "collection"; path: string };

export type SectionSchemas = { lenient: z.ZodType; strict: z.ZodType };

export type SectionDef = {
  id: string;
  kind: SectionKind;
  label: string;
  shortLabel: string;
  group: SectionGroup;
  href: string;
  icon: string;
  scope: SectionScope;
  schema: SectionSchemas;
  itemSchema?: SectionSchemas;
  target: SingletonTarget | ListTarget;
  legacyNodes: LegacyNode[];
  bundles: BundleId[];
  visibilityKey?: { doc: "site" | "edition"; key: string };
  ownerOnly?: boolean;
  noun?: string;
};

export type ParsedSectionId =
  | { type: "site-config" }
  | { type: "site-app" }
  | { type: "edition"; year: number; collection?: EditionCollection }
  | { type: "community"; collection: "team" | "events" | "testimonials" | "faqs" }
  | { type: "modules" }
  | { type: "module"; moduleId: string };

export class UnknownSectionError extends Error {
  constructor(readonly sectionId: string) {
    super(`Unknown section: ${sectionId}`);
    this.name = "UnknownSectionError";
  }
}

export function isSectionId(value: unknown): value is string {
  return typeof value === "string" && SECTION_ID_PATTERN.test(value);
}

export function parseSectionId(id: string): ParsedSectionId {
  if (!isSectionId(id)) throw new UnknownSectionError(id);
  if (id === "site-config" || id === "site-app" || id === "modules") return { type: id };
  if (id === "team" || id === "events" || id === "testimonials" || id === "faqs")
    return { type: "community", collection: id };
  if (id.startsWith("module-")) return { type: "module", moduleId: id.slice("module-".length) };
  const [, year, collection] = /^edition-(\d{4})(?:-(\w+))?$/.exec(id)!;
  return {
    type: "edition",
    year: Number(year),
    ...(collection ? { collection: collection as EditionCollection } : {}),
  };
}

function schemas<K extends keyof typeof strict>(key: K): SectionSchemas {
  return { lenient: lenient[key] as z.ZodType, strict: strict[key] as z.ZodType };
}

export function siteSections(): SectionDef[] {
  return [
    {
      id: "site-config",
      kind: "singleton",
      label: "Site",
      shortLabel: "Site",
      group: "Site",
      href: "/settings/site",
      icon: "tune",
      scope: { type: "site" },
      schema: schemas("siteConfig"),
      target: { type: "doc", path: "site/config" },
      legacyNodes: ["eventDetails", "home/gdgFAQs", "teams", "feedbacks", "events", "home/pastDevfests"],
      bundles: ["home"],
    },
    {
      id: "site-app",
      kind: "singleton",
      label: "App settings",
      shortLabel: "App",
      group: "Site",
      href: "/settings/app",
      icon: "smartphone",
      scope: { type: "site" },
      schema: schemas("siteApp"),
      target: { type: "doc", path: "site/app" },
      legacyNodes: [],
      bundles: [],
      ownerOnly: true,
    },
  ];
}

type EditionListSpec = {
  collection: EditionCollection;
  label: string;
  shortLabel: string;
  route: string;
  icon: string;
  noun: string;
  schema: keyof typeof strict;
  item: keyof typeof strict;
  legacyNodes: LegacyNode[];
  visibility: string;
  inHome: boolean;
};

const EDITION_LISTS: EditionListSpec[] = [
  {
    collection: "sessions",
    label: "Schedule",
    shortLabel: "Schedule",
    route: "schedule",
    icon: "schedule",
    noun: "session",
    schema: "sessions",
    item: "session",
    legacyNodes: ["schedule"],
    visibility: "schedule",
    inHome: false,
  },
  {
    collection: "speakers",
    label: "Speakers",
    shortLabel: "Speakers",
    route: "speakers",
    icon: "record_voice_over",
    noun: "speaker",
    schema: "speakers",
    item: "speaker",
    legacyNodes: ["speakers", "schedule"],
    visibility: "speakers",
    inHome: false,
  },
  {
    collection: "sponsors",
    label: "Sponsors",
    shortLabel: "Sponsors",
    route: "sponsors",
    icon: "handshake",
    noun: "sponsor",
    schema: "sponsors",
    item: "sponsor",
    legacyNodes: ["sponsors"],
    visibility: "sponsors",
    inHome: true,
  },
  {
    collection: "partners",
    label: "Community partners",
    shortLabel: "Partners",
    route: "partners",
    icon: "diversity_3",
    noun: "partner",
    schema: "partners",
    item: "partner",
    legacyNodes: ["communityPartners"],
    visibility: "partners",
    inHome: true,
  },
  {
    collection: "faqs",
    label: "DevFest FAQ",
    shortLabel: "FAQ",
    route: "faq",
    icon: "quiz",
    noun: "question",
    schema: "faqs",
    item: "faq",
    legacyNodes: ["FAQs"],
    visibility: "faqs",
    inHome: true,
  },
];

export function editionSections(year: number, { activeEdition }: { activeEdition: number }): SectionDef[] {
  const active = year === activeEdition;
  const editionBundle: BundleId = `edition-${year}`;
  const doc: SectionDef = {
    id: `edition-${year}`,
    kind: "singleton",
    label: `${year} · Event`,
    shortLabel: "Event",
    group: "DevFest",
    href: `/devfest/${year}/event`,
    icon: "event",
    scope: { type: "edition", year },
    schema: schemas("edition"),
    target: { type: "doc", path: `editions/${year}` },
    legacyNodes: active ? [...ALL_LEGACY_EDITION_NODES, "home/pastDevfests"] : ["home/pastDevfests"],
    bundles: ["home", editionBundle, "editions"],
  };
  const lists = EDITION_LISTS.map((spec): SectionDef => ({
    id: `edition-${year}-${spec.collection}`,
    kind: "list",
    label: `${year} · ${spec.label}`,
    shortLabel: spec.shortLabel,
    group: "DevFest",
    href: `/devfest/${year}/${spec.route}`,
    icon: spec.icon,
    scope: { type: "edition", year },
    schema: schemas(spec.schema),
    itemSchema: schemas(spec.item),
    target: { type: "collection", path: `editions/${year}/${spec.collection}` },
    legacyNodes: active ? spec.legacyNodes : [],
    bundles: active && spec.inHome ? ["home", editionBundle] : [editionBundle],
    visibilityKey: { doc: "edition", key: spec.visibility },
    noun: spec.noun,
  }));
  return [doc, ...lists];
}

type CommunitySpec = {
  id: "team" | "events" | "testimonials" | "faqs";
  label: string;
  route: string;
  icon: string;
  noun: string;
  schema: keyof typeof strict;
  item: keyof typeof strict;
  legacyNode: LegacyNode;
};

const COMMUNITY_LISTS: CommunitySpec[] = [
  {
    id: "team",
    label: "Team",
    route: "team",
    icon: "groups",
    noun: "member",
    schema: "team",
    item: "teamMember",
    legacyNode: "teams",
  },
  {
    id: "events",
    label: "Events",
    route: "events",
    icon: "calendar_month",
    noun: "event",
    schema: "events",
    item: "communityEvent",
    legacyNode: "events",
  },
  {
    id: "testimonials",
    label: "Reviews",
    route: "reviews",
    icon: "reviews",
    noun: "review",
    schema: "testimonials",
    item: "testimonial",
    legacyNode: "feedbacks",
  },
  {
    id: "faqs",
    label: "Community FAQ",
    route: "faq",
    icon: "help",
    noun: "question",
    schema: "faqs",
    item: "faq",
    legacyNode: "home/gdgFAQs",
  },
];

export function communitySections(): SectionDef[] {
  return COMMUNITY_LISTS.map((spec) => ({
    id: spec.id,
    kind: "list",
    label: spec.label,
    shortLabel: spec.label === "Community FAQ" ? "FAQ" : spec.label,
    group: "Community",
    href: `/community/${spec.route}`,
    icon: spec.icon,
    scope: { type: "community" },
    schema: schemas(spec.schema),
    itemSchema: schemas(spec.item),
    target: { type: "collection", path: spec.id },
    legacyNodes: [spec.legacyNode],
    bundles: ["home"],
    visibilityKey: { doc: "site", key: spec.id },
    noun: spec.noun,
  }));
}

export function moduleItemsSchemas(type: ItemModuleType): SectionSchemas {
  return { lenient: lenient.moduleItems(type), strict: strict.moduleItems(type) };
}

export function moduleItemSchemas(type: ItemModuleType): SectionSchemas {
  return { lenient: lenient.itemSchemas[type], strict: strict.itemSchemas[type] };
}

export function moduleSections(modules: Pick<ModuleDoc, "id" | "title" | "type" | "edition" | "icon">[]): SectionDef[] {
  const registry: SectionDef = {
    id: "modules",
    kind: "list",
    label: "Modules",
    shortLabel: "Modules",
    group: "Modules",
    href: "/modules",
    icon: "widgets",
    scope: { type: "module" },
    schema: schemas("modules"),
    itemSchema: schemas("moduleDoc"),
    target: { type: "collection", path: "modules" },
    legacyNodes: [],
    bundles: [
      "home",
      ...new Set(modules.flatMap((module) => (module.edition ? [`edition-${module.edition}` as BundleId] : []))),
    ],
    noun: "module",
  };
  const items = modules
    .filter((module) => isItemModule(module.type))
    .map((module): SectionDef => ({
      id: `module-${module.id}`,
      kind: "list",
      label: module.title || module.id,
      shortLabel: module.title || module.id,
      group: "Modules",
      href: `/modules/${module.id}`,
      icon: module.icon || "widgets",
      scope: { type: "module", moduleId: module.id },
      schema: moduleItemsSchemas(module.type as ItemModuleType),
      itemSchema: moduleItemSchemas(module.type as ItemModuleType),
      target: { type: "collection", path: `moduleItems/${module.id}/items` },
      legacyNodes: [],
      bundles: ["home", ...(module.edition ? [`edition-${module.edition}` as BundleId] : [])],
      noun: "item",
    }));
  return [registry, ...items];
}

export type RegistryInput = {
  activeEdition: number;
  editionYears: number[];
  modules: Pick<ModuleDoc, "id" | "title" | "type" | "edition" | "icon">[];
};

export function buildRegistry({ activeEdition, editionYears, modules }: RegistryInput): SectionDef[] {
  const years = [...new Set([...editionYears, activeEdition])].sort((a, b) => b - a);
  return [
    ...siteSections(),
    ...years.flatMap((year) => editionSections(year, { activeEdition })),
    ...communitySections(),
    ...moduleSections(modules),
  ];
}

export function findSection(registry: SectionDef[], id: string): SectionDef {
  const def = registry.find((candidate) => candidate.id === id);
  if (!def) throw new UnknownSectionError(id);
  return def;
}

export function sectionDefFor(id: string, input: RegistryInput): SectionDef {
  const parsed = parseSectionId(id);
  if (parsed.type === "edition") {
    return findSection(editionSections(parsed.year, { activeEdition: input.activeEdition }), id);
  }
  return findSection(buildRegistry({ ...input, editionYears: [] }), id);
}

export function visibilitySectionId(def: SectionDef): string | null {
  if (!def.visibilityKey) return null;
  if (def.visibilityKey.doc === "site") return "site-config";
  return def.scope.type === "edition" ? `edition-${def.scope.year}` : null;
}
