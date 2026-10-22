import { lenientSchemas, strictSchemas, type SectionValues } from "./schemas";

export const SECTION_KEYS = [
  "eventDetails",
  "schedule",
  "speakers",
  "sponsors",
  "communityPartners",
  "devfestFaqs",
  "gdgFaqs",
  "teams",
  "feedbacks",
  "events",
] as const;

export type SectionKey = (typeof SECTION_KEYS)[number];

export type SectionKind = "object" | "list" | "tiers";

export type SectionDefinition = {
  key: SectionKey;
  label: string;
  rtdbPath: string;
  kind: SectionKind;
  hasEnabled: boolean;
  href: string;
  icon: string;
  group: "DevFest" | "Community";
};

export const SECTIONS: Record<SectionKey, SectionDefinition> = {
  eventDetails: {
    key: "eventDetails",
    label: "Event details",
    rtdbPath: "eventDetails",
    kind: "object",
    hasEnabled: false,
    href: "/devfest/event-details",
    icon: "event",
    group: "DevFest",
  },
  schedule: {
    key: "schedule",
    label: "Schedule",
    rtdbPath: "schedule",
    kind: "list",
    hasEnabled: true,
    href: "/devfest/schedule",
    icon: "schedule",
    group: "DevFest",
  },
  speakers: {
    key: "speakers",
    label: "Speakers",
    rtdbPath: "speakers",
    kind: "list",
    hasEnabled: true,
    href: "/devfest/speakers",
    icon: "record_voice_over",
    group: "DevFest",
  },
  sponsors: {
    key: "sponsors",
    label: "Sponsors",
    rtdbPath: "sponsors",
    kind: "tiers",
    hasEnabled: true,
    href: "/devfest/sponsors",
    icon: "handshake",
    group: "DevFest",
  },
  communityPartners: {
    key: "communityPartners",
    label: "Community partners",
    rtdbPath: "communityPartners",
    kind: "list",
    hasEnabled: true,
    href: "/devfest/partners",
    icon: "diversity_3",
    group: "DevFest",
  },
  devfestFaqs: {
    key: "devfestFaqs",
    label: "DevFest FAQ",
    rtdbPath: "FAQs",
    kind: "list",
    hasEnabled: true,
    href: "/devfest/faq",
    icon: "quiz",
    group: "DevFest",
  },
  events: {
    key: "events",
    label: "Events",
    rtdbPath: "events",
    kind: "list",
    hasEnabled: true,
    href: "/community/events",
    icon: "calendar_month",
    group: "Community",
  },
  teams: {
    key: "teams",
    label: "Team",
    rtdbPath: "teams",
    kind: "list",
    hasEnabled: true,
    href: "/community/team",
    icon: "groups",
    group: "Community",
  },
  gdgFaqs: {
    key: "gdgFaqs",
    label: "Home FAQ",
    rtdbPath: "home/gdgFAQs",
    kind: "list",
    hasEnabled: true,
    href: "/community/faq",
    icon: "help",
    group: "Community",
  },
  feedbacks: {
    key: "feedbacks",
    label: "Reviews",
    rtdbPath: "feedbacks",
    kind: "list",
    hasEnabled: true,
    href: "/community/reviews",
    icon: "reviews",
    group: "Community",
  },
};

export function isSectionKey(value: unknown): value is SectionKey {
  return typeof value === "string" && (SECTION_KEYS as readonly string[]).includes(value);
}

export function parseSection<K extends SectionKey>(key: K, value: unknown): SectionValues[K] {
  return lenientSchemas.sections[key].parse(value) as SectionValues[K];
}

export function validateForPublish(key: SectionKey, value: unknown) {
  return strictSchemas.sections[key].safeParse(value);
}

export function itemCount(key: SectionKey, value: unknown): number | null {
  const definition = SECTIONS[key];
  if (definition.kind === "object" || !value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  if (definition.kind === "tiers") {
    return ["platinum", "gold", "silver"].reduce(
      (total, tier) => total + (Array.isArray(record[tier]) ? (record[tier] as unknown[]).length : 0),
      0,
    );
  }
  return Array.isArray(record.data) ? record.data.length : 0;
}

export function isEnabled(key: SectionKey, value: unknown): boolean | null {
  if (!SECTIONS[key].hasEnabled) return null;
  return Boolean(value && typeof value === "object" && (value as { enabled?: unknown }).enabled);
}
