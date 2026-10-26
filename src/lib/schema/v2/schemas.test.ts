import { describe, expect, it } from "vitest";
import type { z } from "zod";

import { lenient, strict } from "./index";
import { readExample } from "./test-examples";

type Case = { example: string; schema: z.ZodObject | z.ZodType; base: z.ZodObject; id?: string };

const CASES: Case[] = [
  { example: "site-config", schema: strict.siteConfig, base: strict.siteConfig },
  { example: "site-app", schema: strict.siteApp, base: strict.siteAppBase },
  { example: "edition-2026", schema: strict.edition, base: strict.editionBase },
  {
    example: "session",
    schema: strict.session,
    base: strict.sessionBase,
    id: "supercharge-app-dev-with-gen-ai-utilery-1000",
  },
  { example: "speaker", schema: strict.speaker, base: strict.speaker, id: "satish-vj" },
  { example: "sponsor", schema: strict.sponsor, base: strict.sponsor, id: "google-for-developers" },
  { example: "team-member", schema: strict.teamMember, base: strict.teamMember, id: "debajit-mallick" },
  { example: "event", schema: strict.communityEvent, base: strict.communityEventBase, id: "build-with-ai-siliguri" },
  { example: "testimonial", schema: strict.testimonial, base: strict.testimonial, id: "Xk2mQ9wLp4Rt7Yb1Nc3D" },
  {
    example: "blog",
    schema: strict.blog,
    base: strict.blog,
    id: "getting-started-with-gemini-in-flutter",
  },
  { example: "module-showcase", schema: strict.moduleDoc, base: strict.moduleDocBase, id: "project-showcase" },
  { example: "showcase", schema: strict.showcaseItem, base: strict.showcaseItem, id: "Pq8sT2vW6yZ0aB4cD7eF" },
  { example: "showcase-submission", schema: strict.showcaseSubmission, base: strict.showcaseSubmission },
];

function load({ example, id }: Case): Record<string, unknown> {
  const value = readExample(example);
  return id ? { id, ...value } : value;
}

function requiredKeys(schema: z.ZodObject): string[] {
  return Object.entries(schema.shape)
    .filter(([, field]) => !(field as z.ZodType).safeParse(undefined).success)
    .map(([key]) => key);
}

function issues(schema: z.ZodType, value: unknown) {
  const result = schema.safeParse(value);
  return result.success ? [] : result.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`);
}

describe.each(CASES)("$example", (testCase) => {
  it("parses in strict mode", () => {
    expect(issues(testCase.schema, load(testCase))).toEqual([]);
  });

  it.each(requiredKeys(testCase.base))("fails without %s", (key) => {
    const value = load(testCase);
    delete value[key];
    expect(testCase.schema.safeParse(value).success).toBe(false);
  });

  it("rejects unknown keys", () => {
    expect(testCase.schema.safeParse({ ...load(testCase), surprise: true }).success).toBe(false);
  });

  it("keeps unknown keys in lenient drafts", () => {
    const schema = testCase.schema === strict.siteConfig ? lenient.siteConfig : null;
    if (!schema) return;
    expect((schema.parse({ ...load(testCase), surprise: true }) as Record<string, unknown>).surprise).toBe(true);
  });
});

describe("cross-field rules", () => {
  const edition = readExample("edition-2026");

  it("requires an edition to end after it starts", () => {
    expect(issues(strict.edition, { ...edition, endAt: edition.startAt })).toEqual([
      "endAt: The event must end after it starts",
    ]);
  });

  it("requires registration to close before the event ends", () => {
    const registration = { closesAt: "2026-11-15T00:00:00.000Z" };
    expect(issues(strict.edition, { ...edition, registration })).toEqual([
      "registration.closesAt: Registration must close before the event ends",
    ]);
  });

  it("rejects duplicate track ids and a pasted iframe", () => {
    const tracks = edition.tracks as { id: string }[];
    const venue = {
      ...(edition.venue as object),
      embedUrl: `${(edition.venue as { embedUrl: string }).embedUrl}" width="600`,
    };
    expect(issues(strict.edition, { ...edition, tracks: [...tracks, tracks[0]], venue })).toEqual([
      "venue.embedUrl: Paste only the https://www.google.com/maps/embed?pb=… link, not the whole iframe",
      'tracks.4.id: Id "ai" is already used by item 1',
    ]);
  });

  it("requires a session to end after it starts", () => {
    const session = { id: "x", ...readExample<{ startAt: string }>("session") };
    expect(issues(strict.session, { ...session, endAt: session.startAt })).toEqual([
      "endAt: The session must end after it starts",
    ]);
  });

  it("rejects duplicate ids in a list and more than 200 items", () => {
    const speaker = { id: "satish-vj", ...readExample("speaker") };
    expect(issues(strict.speakers, { items: [speaker, speaker] })).toEqual([
      'items.1.id: Id "satish-vj" is already used by item 1',
    ]);
    const many = Array.from({ length: 201 }, (_, index) => ({ ...speaker, id: `s-${index}` }));
    expect(issues(strict.speakers, { items: many })).toEqual(["items: A list can have at most 200 items"]);
  });

  it("requires at least one organizer in the team", () => {
    const member = { id: "a", ...readExample("team-member"), role: "volunteer" };
    expect(issues(strict.team, { items: [member] })).toEqual(["items: The team needs at least one organizer"]);
  });

  it("requires a page path for page modules, unique across modules, and a matching source", () => {
    const showcaseModule = {
      id: "project-showcase",
      ...readExample<{ placement: Record<string, unknown> }>("module-showcase"),
    };
    const noPath = { ...showcaseModule, placement: { ...showcaseModule.placement, web: { slot: "page", order: 10 } } };
    expect(issues(strict.moduleDoc, noPath)).toEqual(["placement.web.path: A page module needs a path"]);
    expect(issues(strict.moduleDoc, { ...showcaseModule, source: { kind: "items" } })).toEqual([
      'source.kind: A showcase module needs a "showcase" source',
    ]);
    expect(issues(strict.modules, { items: [showcaseModule, { ...showcaseModule, id: "other" }] })).toEqual([
      "items.1.placement.web.path: The path /showcase is already used by module 1",
    ]);
  });

  it("blocks raising the minimum build above the latest build", () => {
    expect(
      issues(strict.siteApp, { ...readExample<Record<string, unknown>>("site-app"), minSupportedBuild: 5000 }),
    ).toEqual(["minSupportedBuild: The minimum supported build can't be higher than the latest build"]);
  });

  it("rejects script tags in markdown", () => {
    const faq = { id: "a", question: "Q", answer: "<script>alert(1)</script>", order: 10 };
    expect(issues(strict.faq, faq)).toEqual(["answer: Answer can't contain <script> or <iframe>"]);
  });

  it("checks enums and https links", () => {
    const session = { id: "x", ...readExample("session"), type: "party", slidesUrl: "http://slides.dev" };
    expect(issues(strict.session, session)).toEqual([
      expect.stringMatching(/^type: Type must be one of keynote/),
      "slidesUrl: The slides link must be a full https:// link",
    ]);
  });
});

describe("lenient drafts", () => {
  it("fills empty defaults so editors always get controlled values", () => {
    expect(lenient.speaker.parse({})).toMatchObject({
      id: "",
      name: "",
      headline: "",
      photo: { url: "", alt: "" },
      order: 0,
    });
    expect(lenient.sessions.parse({})).toEqual({ items: [] });
    expect(lenient.edition.parse({}).sections).toEqual({
      schedule: false,
      speakers: false,
      sponsors: false,
      partners: false,
      faqs: false,
      perks: false,
      notes: false,
      registration: false,
    });
  });

  it("accepts incomplete values that strict rejects", () => {
    const draft = { items: [{ id: "", name: "", headline: "", photo: { url: "", alt: "" }, order: 0 }] };
    expect(lenient.speakers.safeParse(draft).success).toBe(true);
    expect(strict.speakers.safeParse(draft).success).toBe(false);
  });
});
