import { beforeEach, describe, expect, it } from "vitest";

import { adminDatabaseFor, adminFirestoreFor } from "@/lib/firebase/admin-app";
import { resetEmulatorData, rtdbRoot, seed } from "@/test/emulator-reset";

import { ContentError } from "./errors";
import {
  discardDraft,
  getSection,
  listAudit,
  listRevisions,
  publish,
  revertToRevision,
  saveDraft,
  toggleEnabled,
} from "./repository";
import type { CommunityEvent } from "./schemas";

const owner = { email: "owner@example.com" };
const editor = { email: "editor@example.com" };

function omit<T extends Record<string, unknown>>(value: T, field: string): Record<string, unknown> {
  return Object.fromEntries(Object.entries(value).filter(([key]) => key !== field));
}

async function rtdb(path: string) {
  return (await adminDatabaseFor().ref(path).get()).val();
}

async function expectContentError(promise: Promise<unknown>, code: ContentError["code"]) {
  const error = await promise.then(
    () => null,
    (caught: unknown) => caught,
  );
  expect(error).toBeInstanceOf(ContentError);
  expect((error as ContentError).code).toBe(code);
  return error as ContentError;
}

const sampleEvent: CommunityEvent = {
  id: "build-with-ai-2026",
  name: "Build with AI 2026",
  tagline: "Hands-on with Gemini",
  description: "A day of workshops.",
  thumbnail: "https://ik.imagekit.io/gdgsiliguri1/events/bwai-thumb.png",
  coverImg: "https://ik.imagekit.io/gdgsiliguri1/events/bwai-cover.png",
  registrationDate: "2026-03-01",
  eventDate: "2026-03-15",
  registrationLink: "https://gdg.community.dev/events/details/bwai",
  speakers: [{ name: "Debajit Mallick", imageUrl: "", description: "Organizer" }],
};

beforeEach(async () => {
  await resetEmulatorData();
});

describe("import", () => {
  it("creates every section at version 1 with draft equal to published", async () => {
    const teams = await getSection("teams");
    expect(teams.version).toBe(1);
    expect(teams.hasDraftChanges).toBe(false);
    expect(teams.draft.data).toHaveLength(21);
    const events = await getSection("events");
    expect(events.published).toEqual({ enabled: false, data: [] });
    expect(await rtdb("events")).toBeNull();
  });
});

describe("drafts", () => {
  it("saving a draft leaves the live data alone", async () => {
    const reviews = await getSection("feedbacks");
    const reordered = { ...reviews.draft, data: [...reviews.draft.data].reverse() };
    const saved = await saveDraft("feedbacks", reordered, editor);
    expect(saved.hasDraftChanges).toBe(true);
    expect(saved.draftUpdatedBy).toBe(editor.email);
    expect(await rtdb("feedbacks")).toEqual(seed.feedbacks);
  });

  it("discarding restores the published version", async () => {
    const faq = await getSection("devfestFaqs");
    await saveDraft("devfestFaqs", { ...faq.draft, data: faq.draft.data.slice(1) }, editor);
    const discarded = await discardDraft("devfestFaqs", editor);
    expect(discarded.hasDraftChanges).toBe(false);
    expect(discarded.draft).toEqual(faq.published);
  });

  it("allows saving an incomplete draft but not publishing it", async () => {
    const faq = await getSection("devfestFaqs");
    await saveDraft("devfestFaqs", { ...faq.draft, data: [...faq.draft.data, { question: "", answer: "" }] }, editor);
    const error = await expectContentError(publish("devfestFaqs", 1, editor), "invalid");
    expect(error.issues.map((issue) => issue.path.join("."))).toEqual(["data.17.question", "data.17.answer"]);
    expect(await rtdb("FAQs")).toEqual(seed.FAQs);
    expect((await getSection("devfestFaqs")).version).toBe(1);
  });
});

describe("publish", () => {
  it("writes the Realtime Database and the Firestore mirror consistently", async () => {
    const reviews = await getSection("feedbacks");
    const reordered = { ...reviews.draft, data: [...reviews.draft.data].reverse() };
    await saveDraft("feedbacks", reordered, editor);

    const published = await publish("feedbacks", 1, editor, "Newest first");

    expect(published.version).toBe(2);
    expect(published.hasDraftChanges).toBe(false);
    expect(published.publishedBy).toBe(editor.email);
    expect(await rtdb("feedbacks")).toEqual(reordered);
    expect(published.published).toEqual(reordered);

    const revisions = await listRevisions("feedbacks");
    expect(revisions.map((revision) => [revision.version, revision.note])).toEqual([
      [2, "Newest first"],
      [1, "Imported from /feedbacks"],
    ]);

    const { entries } = await listAudit({ sectionKey: "feedbacks" });
    expect(entries.map((entry) => entry.action)).toEqual(["publish", "save_draft"]);
    expect(entries[0].summary).toBe("Published Reviews (5 items)");
  });

  it("only touches its own path in the Realtime Database", async () => {
    const reviews = await getSection("feedbacks");
    await saveDraft("feedbacks", { ...reviews.draft, data: reviews.draft.data.slice(0, 2) }, editor);
    await publish("feedbacks", 1, editor);
    expect(omit(await rtdbRoot(), "feedbacks")).toEqual(omit(seed, "feedbacks"));
  });

  it("rejects a publish based on a stale version", async () => {
    await publish("feedbacks", 1, owner);
    await expectContentError(publish("feedbacks", 1, editor), "stale_version");
    expect((await getSection("feedbacks")).version).toBe(2);
  });

  it("lets only one of two simultaneous publishes through", async () => {
    const results = await Promise.allSettled([
      publish("devfestFaqs", 1, owner),
      publish("devfestFaqs", 1, editor),
    ]);
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    const rejected = results.find((result) => result.status === "rejected") as PromiseRejectedResult;
    expect(["stale_version", "publish_in_progress"]).toContain((rejected.reason as ContentError).code);
    expect((await getSection("devfestFaqs")).version).toBe(2);
    expect(await listRevisions("devfestFaqs")).toHaveLength(2);
  });

  it("blocks the teams section until the schemeless Twitter link is fixed, and trims links", async () => {
    const teams = await getSection("teams");
    await expectContentError(publish("teams", 1, owner), "invalid");

    const fixed = structuredClone(teams.draft);
    fixed.data[5].twitterURL = "https://Twitter.com/debuisalive";
    await saveDraft("teams", fixed, owner);
    await publish("teams", 1, owner);

    const live = await rtdb("teams");
    expect(live.data[5].twitterURL).toBe("https://Twitter.com/debuisalive");
    expect(live.data[9].twitterURL).toBe("https://x.com/Hrxhab23?t=v58otAkZDM_e1mLDsC7bkw&s=08");
    expect(live.data[9].linkedInURL.endsWith(" ")).toBe(false);
  });

  it("refuses to publish an enabled section with no items and never writes an empty array", async () => {
    const reviews = await getSection("feedbacks");
    await saveDraft("feedbacks", { ...reviews.draft, data: [] }, editor);
    await expectContentError(publish("feedbacks", 1, editor), "empty_section");
    expect(await rtdb("feedbacks")).toEqual(seed.feedbacks);

    await saveDraft("feedbacks", { enabled: false, data: [] }, editor);
    await publish("feedbacks", 1, editor);
    expect(await rtdb("feedbacks")).toEqual({ enabled: false });
  });

  it("creates /events in the Realtime Database when the first event is published", async () => {
    await saveDraft("events", { enabled: true, data: [sampleEvent] }, owner);
    await publish("events", 1, owner);
    expect(await rtdb("events")).toEqual({ enabled: true, data: [sampleEvent] });
  });

  it("omits an event's empty speakers list instead of writing []", async () => {
    await saveDraft("events", { enabled: true, data: [{ ...sampleEvent, speakers: [] }] }, owner);
    await publish("events", 1, owner);
    expect(await rtdb("events")).toEqual({ enabled: true, data: [omit(sampleEvent, "speakers")] });
  });

  it("writes event details to the exact shape the site reads", async () => {
    const details = await getSection("eventDetails");
    await saveDraft("eventDetails", { ...details.draft, eventVenue: { ...details.draft.eventVenue, name: "Siliguri Institute" } }, owner);
    await publish("eventDetails", 1, owner);
    const expected = structuredClone(seed.eventDetails) as Record<string, Record<string, unknown>>;
    expected.eventVenue.name = "Siliguri Institute";
    expect(await rtdb("eventDetails")).toEqual(expected);
  });
});

describe("toggle", () => {
  it("turning a section off and on again leaves the database identical to the seed", async () => {
    await toggleEnabled("feedbacks", false, 1, owner);
    expect(await rtdb("feedbacks")).toEqual({ ...(seed.feedbacks as object), enabled: false });
    await toggleEnabled("feedbacks", true, 2, owner);
    expect(await rtdbRoot()).toEqual(seed);
    const { entries } = await listAudit({ sectionKey: "feedbacks" });
    expect(entries.map((entry) => entry.summary)).toEqual(["Turned Reviews on", "Turned Reviews off"]);
  });

  it("does not publish unrelated draft changes", async () => {
    const reviews = await getSection("feedbacks");
    const shortened = { ...reviews.draft, data: reviews.draft.data.slice(0, 1) };
    await saveDraft("feedbacks", shortened, editor);
    const toggled = await toggleEnabled("feedbacks", false, 1, owner);
    expect((await rtdb("feedbacks")).data).toHaveLength(5);
    expect(toggled.draft).toEqual({ ...shortened, enabled: false });
    expect(toggled.published.enabled).toBe(false);
  });

  it("works on live data that would fail strict validation", async () => {
    await toggleEnabled("teams", false, 1, owner);
    expect((await rtdb("teams")).enabled).toBe(false);
  });

  it("cannot enable a section that has no items", async () => {
    await expectContentError(toggleEnabled("events", true, 1, owner), "empty_section");
    expect(await rtdb("events")).toBeNull();
  });

  it("is not available for event details", async () => {
    await expectContentError(toggleEnabled("eventDetails", false, 1, owner), "not_toggleable");
  });
});

describe("revert", () => {
  it("loads an old revision into the draft without publishing it", async () => {
    const faq = await getSection("devfestFaqs");
    await saveDraft("devfestFaqs", { ...faq.draft, data: faq.draft.data.slice(0, 3) }, owner);
    await publish("devfestFaqs", 1, owner);
    const [, original] = await listRevisions("devfestFaqs");

    const reverted = await revertToRevision("devfestFaqs", original.id, owner);

    expect(reverted.draft).toEqual(faq.published);
    expect(reverted.hasDraftChanges).toBe(true);
    expect((await rtdb("FAQs")).data).toHaveLength(3);
    const { entries } = await listAudit({ sectionKey: "devfestFaqs", limit: 1 });
    expect(entries[0].action).toBe("revert");
  });

  it("keeps the section's current on/off setting", async () => {
    const [imported] = await listRevisions("feedbacks");
    await toggleEnabled("feedbacks", false, 1, owner);

    const reverted = await revertToRevision("feedbacks", imported.id, owner);

    expect(reverted.draft.enabled).toBe(false);
  });

  it("reports a missing revision", async () => {
    await expectContentError(revertToRevision("devfestFaqs", "nope", owner), "revision_missing");
  });
});

describe("audit log", () => {
  it("paginates newest first and filters by person", async () => {
    const reviews = await getSection("feedbacks");
    for (let index = 0; index < 3; index += 1) {
      await saveDraft("feedbacks", reviews.draft, index === 1 ? owner : editor);
    }
    const first = await listAudit({ limit: 2 });
    expect(first.entries).toHaveLength(2);
    expect(first.next).not.toBeNull();
    const second = await listAudit({ limit: 2, after: first.next! });
    expect(second.entries).toHaveLength(1);
    expect(second.next).toBeNull();
    const byOwner = await listAudit({ actorEmail: owner.email });
    expect(byOwner.entries).toHaveLength(1);
  });
});

describe("firestore documents", () => {
  it("never leaves a publish lock behind", async () => {
    await publish("feedbacks", 1, owner);
    await expectContentError(publish("feedbacks", 1, owner), "stale_version");
    const doc = await adminFirestoreFor().collection("content").doc("feedbacks").get();
    expect(doc.get("publishLock")).toBeUndefined();
  });
});
