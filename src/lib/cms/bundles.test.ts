import { describe, expect, it } from "vitest";

import type { Blog, ModuleDoc, Sponsor, TeamMember } from "@/lib/schema/v2";
import { readExample } from "@/lib/schema/v2/test-examples";

import { buildEditionBundle, buildEditionsBundle, buildHomeBundle, sortSponsors, sortTeam } from "./bundles";
import { planListPublish, singletonChanged, withoutMeta } from "./diff";
import { backfill, memoryReader } from "./test-data";

const meta = { generatedAt: "2026-10-26T04:30:00.000Z" };

function blog(id: string, publishedAt: string, pinned = false): Blog {
  return {
    id,
    title: id,
    brief: "b",
    url: `https://gdgsiliguri.hashnode.dev/${id}`,
    author: { name: "GDG Siliguri" },
    publishedAt,
    pinned,
    source: "hashnode",
  };
}

const cardsModule: ModuleDoc = {
  id: "study-jams",
  type: "cards",
  title: "Study Jams",
  source: { kind: "items" },
  placement: { app: { slot: "homeCard", order: 10 }, web: { slot: "homeSection", order: 10 } },
  enabled: true,
};

describe("home bundle", () => {
  it("matches the shape of the example", async () => {
    const bundle = await buildHomeBundle(memoryReader(backfill()), meta);
    const example = readExample<Record<string, unknown>>("bundle-home");
    expect(Object.keys(bundle).sort()).toEqual(Object.keys(example).sort());
    expect(bundle.site.sections).toEqual({
      ...(example.site as { sections: object }).sections,
      events: false,
      pastEditions: false,
    });
    expect(bundle.edition.sections).toEqual((example.edition as { sections: object }).sections);
    expect(bundle.partners.find((partner) => partner.id === "flutterflow-students-community-india")).toEqual(
      (example.partners as unknown[])[0],
    );
    const sahil = bundle.testimonials.find((item) => item.name === "Sahil Saha");
    expect(sahil).toMatchObject({ title: "Awesome Experience!", eventLabel: "@Devfest'19", featured: true, order: 50 });
    expect(bundle.team[0]).toMatchObject({ id: "debajit-mallick", role: "organizer", active: true, order: 10 });
    expect(bundle.pastEditions).toEqual([]);
  });

  it("drops updatedAt from items and stamps the bundle", async () => {
    const data = backfill();
    data.team[0] = { ...data.team[0], updatedAt: "2026-10-01T00:00:00.000Z" } as TeamMember;
    const bundle = await buildHomeBundle(
      memoryReader(data, { versions: { team: 4, "edition-2025-sessions": 2 } }),
      meta,
    );
    expect(bundle.team[0]).not.toHaveProperty("updatedAt");
    expect(bundle).toMatchObject({ schemaVersion: 2, generatedAt: meta.generatedAt, sourceVersions: { team: 4 } });
    expect(bundle.sourceVersions).not.toHaveProperty("edition-2025-sessions");
  });

  it("empties hidden sections", async () => {
    const data = backfill();
    data.site.sections = { ...data.site.sections, team: false, testimonials: false, faqs: false, pastEditions: true };
    data.editions[2026].doc.sections.partners = false;
    const bundle = await buildHomeBundle(memoryReader(data), meta);
    expect(bundle.team).toEqual([]);
    expect(bundle.testimonials).toEqual([]);
    expect(bundle.faqs).toEqual([]);
    expect(bundle.partners).toEqual([]);
    expect(bundle.editionFaqs.length).toBeGreaterThan(0);
    expect(bundle.pastEditions.map((edition) => edition.year)).toEqual([2025]);
  });

  it("shows pinned posts first and at most ten", async () => {
    const blogs = [
      ...Array.from({ length: 12 }, (_, index) => blog(`post-${index}`, `2026-0${(index % 9) + 1}-01T00:00:00.000Z`)),
      blog("pinned-old", "2020-01-01T00:00:00.000Z", true),
    ];
    const bundle = await buildHomeBundle(memoryReader(backfill(), { blogs }), meta);
    expect(bundle.blogs).toHaveLength(10);
    expect(bundle.blogs[0].id).toBe("pinned-old");
    expect(bundle.blogs[1].publishedAt).toBe("2026-09-01T00:00:00.000Z");
  });

  it("inlines items of enabled modules for the active edition only", async () => {
    const items = [
      { id: "a", title: "Week 1", order: 20 },
      { id: "b", title: "Week 0", order: 10 },
    ];
    const modules: ModuleDoc[] = [
      cardsModule,
      { ...cardsModule, id: "old", edition: 2025 },
      { ...cardsModule, id: "off", enabled: false },
    ];
    const bundle = await buildHomeBundle(
      memoryReader(backfill(), { modules, moduleItems: { "study-jams": items } }),
      meta,
    );
    expect(bundle.modules.map((module) => module.id)).toEqual(["study-jams"]);
    expect(bundle.modules[0].items?.map((item) => item.id)).toEqual(["b", "a"]);
  });
});

describe("edition bundle", () => {
  it("resolves speakers on sessions and session ids on speakers", async () => {
    const data = backfill();
    data.editions[2025].doc.sections.schedule = true;
    const bundle = await buildEditionBundle(memoryReader(data), 2025, meta);
    const satish = bundle.sessions.find((session) => session.id === "supercharge-app-dev-with-gen-ai-utilery-1000");
    const example = readExample<{ sessions: { speakers: unknown[] }[] }>("bundle-edition-2026");
    expect(satish?.speakers).toEqual([
      { id: "satish-vj", name: "Satish VJ", headline: "Tech Architect, Investor", photo: expect.any(Object) },
    ]);
    expect(Object.keys(satish!.speakers[0]).sort()).toEqual(
      Object.keys(example.sessions[1].speakers[0] as object).sort(),
    );
    expect(bundle.speakers.find((speaker) => speaker.id === "satish-vj")?.sessionIds).toEqual([
      "supercharge-app-dev-with-gen-ai-utilery-1000",
    ]);
    expect(bundle.sessions.map((session) => session.startAt)).toEqual(
      [...bundle.sessions.map((session) => session.startAt)].sort(),
    );
  });

  it("is empty for hidden sections and still carries the flags", async () => {
    const data = backfill();
    data.editions[2025].doc.sections = { ...data.editions[2025].doc.sections, speakers: false, sponsors: false };
    const bundle = await buildEditionBundle(memoryReader(data), 2025, meta);
    expect(bundle.speakers).toEqual([]);
    expect(bundle.sponsors).toEqual([]);
    expect(bundle.edition.sections.speakers).toBe(false);
    expect(bundle.sessions[0].speakers).toEqual([]);
  });

  it("has nothing but partners and FAQs for 2026", async () => {
    const bundle = await buildEditionBundle(memoryReader(backfill()), 2026, meta);
    expect([bundle.sessions, bundle.speakers, bundle.sponsors]).toEqual([[], [], []]);
    expect(bundle.partners).toHaveLength(11);
    expect(bundle.faqs.length).toBeGreaterThan(0);
  });
});

describe("editions bundle", () => {
  it("lists editions newest first", async () => {
    const bundle = await buildEditionsBundle(memoryReader(backfill()), meta);
    expect(bundle.items.map((item) => [item.year, item.venueName])).toEqual([
      [2026, "ITC Fortune Select Siliguri"],
      [2025, "Royal Sarovar Portico"],
    ]);
  });
});

describe("sorting", () => {
  it("orders sponsors by tier, then order", () => {
    const sponsor = (id: string, tier: Sponsor["tier"], order: number) => ({ id, tier, order });
    expect(
      sortSponsors([
        sponsor("a", "media", 10),
        sponsor("b", "gold", 20),
        sponsor("c", "platinum", 30),
        sponsor("d", "gold", 10),
      ]).map((item) => item.id),
    ).toEqual(["c", "d", "b", "a"]);
  });

  it("orders the team by role, then order", () => {
    const member = (id: string, role: string, order: number) => ({ id, role, order });
    expect(
      sortTeam([member("a", "volunteer", 10), member("b", "alumni", 5), member("c", "organizer", 20)]).map(
        (item) => item.id,
      ),
    ).toEqual(["c", "a", "b"]);
  });
});

describe("planListPublish", () => {
  const current = [
    { id: "a", question: "Q1", answer: "A1", order: 10, updatedAt: "2026-01-01T00:00:00.000Z" },
    { id: "b", question: "Q2", answer: "A2", order: 20 },
  ];

  it("adds, edits, reorders and deletes", () => {
    const draft = [
      { id: "b", question: "Q2", answer: "A2", order: 10 },
      { id: "a", question: "Q1", answer: "A1 edited", order: 20 },
      { id: "c", question: "Q3", answer: "A3", order: 30 },
    ];
    expect(planListPublish(draft, current)).toEqual({
      upserts: [
        { id: "b", data: { question: "Q2", answer: "A2", order: 10 } },
        { id: "a", data: { question: "Q1", answer: "A1 edited", order: 20 } },
        { id: "c", data: { question: "Q3", answer: "A3", order: 30 } },
      ],
      deletes: [],
    });
    expect(planListPublish([draft[0]], current).deletes).toEqual(["a"]);
  });

  it("skips unchanged items and ignores updatedAt", () => {
    const unchanged = current.map((item) => ({ ...withoutMeta(item), id: item.id }));
    expect(planListPublish(unchanged, current)).toEqual({
      upserts: [],
      deletes: [],
    });
  });

  it("detects singleton changes", () => {
    expect(singletonChanged({ a: 1 }, null)).toBe(true);
    expect(singletonChanged({ a: 1 }, { a: 1, updatedAt: "x" })).toBe(false);
    expect(singletonChanged({ a: 2 }, { a: 1 })).toBe(true);
  });
});
