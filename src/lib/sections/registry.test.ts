import { describe, expect, it } from "vitest";

import {
  buildRegistry,
  isSectionId,
  parseSectionId,
  sectionDefFor,
  UnknownSectionError,
  visibilitySectionId,
} from "./registry";

const input = {
  activeEdition: 2026,
  editionYears: [2025, 2026],
  modules: [
    { id: "study-jams", title: "Study Jams", type: "cards" as const },
    { id: "project-showcase", title: "Community Projects", type: "showcase" as const, edition: 2026 },
  ],
};

const registry = buildRegistry(input);
const byId = (id: string) => sectionDefFor(id, input);

describe("section ids", () => {
  it.each([
    "site-config",
    "site-app",
    "edition-2026",
    "edition-2025-sessions",
    "edition-2026-faqs",
    "team",
    "events",
    "testimonials",
    "faqs",
    "modules",
    "module-study-jams",
  ])("accepts %s", (id) => {
    expect(isSectionId(id)).toBe(true);
  });

  it.each(["eventDetails", "edition-26", "edition-2026-tracks", "module-", "module-Bad", "team/x", ""])(
    "rejects %s",
    (id) => {
      expect(isSectionId(id)).toBe(false);
      expect(() => parseSectionId(id)).toThrow(UnknownSectionError);
    },
  );

  it("parses scope from the id", () => {
    expect(parseSectionId("edition-2025-speakers")).toEqual({ type: "edition", year: 2025, collection: "speakers" });
    expect(parseSectionId("edition-2026")).toEqual({ type: "edition", year: 2026 });
    expect(parseSectionId("module-study-jams")).toEqual({ type: "module", moduleId: "study-jams" });
    expect(parseSectionId("faqs")).toEqual({ type: "community", collection: "faqs" });
  });
});

describe("registry", () => {
  it("lists site, both editions, community and modules", () => {
    expect(registry.map((def) => def.id)).toEqual([
      "site-config",
      "site-app",
      "edition-2026",
      "edition-2026-sessions",
      "edition-2026-speakers",
      "edition-2026-sponsors",
      "edition-2026-partners",
      "edition-2026-faqs",
      "edition-2025",
      "edition-2025-sessions",
      "edition-2025-speakers",
      "edition-2025-sponsors",
      "edition-2025-partners",
      "edition-2025-faqs",
      "team",
      "events",
      "testimonials",
      "faqs",
      "modules",
      "module-study-jams",
    ]);
  });

  it("targets the right Firestore paths", () => {
    expect(byId("site-config").target).toEqual({ type: "doc", path: "site/config" });
    expect(byId("edition-2026").target).toEqual({ type: "doc", path: "editions/2026" });
    expect(byId("edition-2025-sessions").target).toEqual({ type: "collection", path: "editions/2025/sessions" });
    expect(byId("testimonials").target).toEqual({ type: "collection", path: "testimonials" });
    expect(byId("module-study-jams").target).toEqual({ type: "collection", path: "moduleItems/study-jams/items" });
  });

  it("regenerates the legacy RTDB nodes from the adapter table", () => {
    const nodes = Object.fromEntries(registry.map((def) => [def.id, def.legacyNodes]));
    expect(nodes).toMatchObject({
      "site-config": ["eventDetails", "home/gdgFAQs", "teams", "feedbacks", "events", "home/pastDevfests"],
      "site-app": [],
      "edition-2026": ["eventDetails", "schedule", "speakers", "home/pastDevfests"],
      "edition-2026-sessions": ["schedule"],
      "edition-2026-speakers": ["speakers", "schedule"],
      "edition-2026-sponsors": ["sponsors"],
      "edition-2026-partners": ["communityPartners"],
      "edition-2026-faqs": ["FAQs"],
      "edition-2025": ["home/pastDevfests"],
      "edition-2025-sessions": [],
      "edition-2025-faqs": [],
      team: ["teams"],
      events: ["events"],
      testimonials: ["feedbacks"],
      faqs: ["home/gdgFAQs"],
      modules: [],
      "module-study-jams": [],
    });
  });

  it("rebuilds the bundles that read each section", () => {
    const bundles = Object.fromEntries(registry.map((def) => [def.id, def.bundles]));
    expect(bundles).toMatchObject({
      "site-config": ["home"],
      "site-app": [],
      "edition-2026": ["home", "edition-2026", "editions"],
      "edition-2026-sessions": ["edition-2026"],
      "edition-2026-speakers": ["edition-2026"],
      "edition-2026-sponsors": ["home", "edition-2026"],
      "edition-2026-partners": ["home", "edition-2026"],
      "edition-2026-faqs": ["home", "edition-2026"],
      "edition-2025": ["home", "edition-2025", "editions"],
      "edition-2025-sponsors": ["edition-2025"],
      team: ["home"],
      modules: ["home", "edition-2026"],
      "module-study-jams": ["home"],
    });
  });

  it("knows which singleton owns each on/off switch", () => {
    expect(visibilitySectionId(byId("edition-2025-speakers"))).toBe("edition-2025");
    expect(byId("edition-2025-speakers").visibilityKey).toEqual({ doc: "edition", key: "speakers" });
    expect(visibilitySectionId(byId("testimonials"))).toBe("site-config");
    expect(visibilitySectionId(byId("edition-2026"))).toBeNull();
  });

  it("only gives item-based modules an items section", () => {
    expect(() => byId("module-project-showcase")).toThrow(UnknownSectionError);
  });

  it("marks App settings as owner-only", () => {
    expect(byId("site-app").ownerOnly).toBe(true);
    expect(byId("site-config").ownerOnly).toBeUndefined();
  });
});
