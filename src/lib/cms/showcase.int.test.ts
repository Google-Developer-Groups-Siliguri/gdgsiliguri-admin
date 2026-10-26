import { beforeEach, describe, expect, it } from "vitest";

import { firestoreDoc, resetV2Data } from "@/test/v2-reset";

import {
  approveSubmission,
  generateIngestSecret,
  hideSubmission,
  IngestError,
  ingestSubmission,
  listSubmissions,
  rejectSubmission,
  resetRateLimit,
  setAcceptingSubmissions,
  setShowcaseFeatured,
} from "./showcase";

const owner = { email: "owner@example.com" };

const body = (overrides: Record<string, unknown> = {}) =>
  JSON.stringify({
    title: "KrishiMitra",
    summary: "Identifies tea leaf diseases from a photo.",
    team: [{ name: "Priya Sharma", github: "https://github.com/priya" }, { name: "Rahul Das" }],
    email: "priya@example.com",
    repo: "https://github.com/priya/krishimitra",
    tags: ["Gemini", "Flutter"],
    edition: 2025,
    consent: true,
    ...overrides,
  });

async function ingestError(promise: Promise<unknown>): Promise<IngestError> {
  const error = await promise.then(
    () => null,
    (caught: unknown) => caught,
  );
  expect(error).toBeInstanceOf(IngestError);
  return error as IngestError;
}

let secret: string;

beforeEach(async () => {
  await resetV2Data();
  resetRateLimit();
  secret = await generateIngestSecret(owner);
  await setAcceptingSubmissions(true, owner);
});

describe("ingest", () => {
  it("refuses a bad secret and closed submissions", async () => {
    expect((await ingestError(ingestSubmission(body(), "wrong"))).status).toBe(403);
    expect((await ingestError(ingestSubmission(body(), null))).status).toBe(403);
    await setAcceptingSubmissions(false, owner);
    expect((await ingestError(ingestSubmission(body(), secret))).status).toBe(403);
  });

  it("stores a pending submission and updates it on a duplicate", async () => {
    const first = await ingestSubmission(body(), secret);
    const second = await ingestSubmission(body({ summary: "Now with offline mode." }), secret);
    expect(second).toEqual({ ok: true, id: first.id, duplicate: true });
    const [pending] = await listSubmissions("pending");
    expect(pending).toMatchObject({ id: first.id, consent: true, payload: { summary: "Now with offline mode." } });
  });

  it("rejects bad bodies, oversized requests and floods", async () => {
    expect((await ingestError(ingestSubmission(body({ title: "" }), secret))).status).toBe(400);
    expect((await ingestError(ingestSubmission("{not json", secret))).status).toBe(400);
    expect((await ingestError(ingestSubmission(" ".repeat(33 * 1024), secret))).status).toBe(413);
    for (let index = 0; index < 18; index += 1) await ingestSubmission(body({ title: `P${index}` }), secret);
    expect((await ingestError(ingestSubmission(body({ title: "Over" }), secret))).status).toBe(429);
  });
});

describe("review", () => {
  it("publishes an approved project without any contact data", async () => {
    const { id } = await ingestSubmission(body(), secret);
    const showcaseId = await approveSubmission(id, owner);
    const doc = await firestoreDoc(`showcase/${showcaseId}`);
    expect(doc).toMatchObject({ title: "KrishiMitra", edition: 2025, featured: false });
    expect(JSON.stringify(doc)).not.toMatch(/priya@example\.com|email|contact/);
    const bundle = await firestoreDoc<{ showcase: unknown[] }>("bundles/edition-2025");
    expect(JSON.stringify(bundle?.showcase)).toContain("KrishiMitra");
    expect(JSON.stringify(bundle)).not.toMatch(/priya@example\.com/);

    await setShowcaseFeatured(showcaseId, true, owner);
    const home = await firestoreDoc<{ showcaseFeatured: unknown[] }>("bundles/home");
    expect(home?.showcaseFeatured).toEqual([]);
  });

  it("refuses to approve without consent and needs a note to reject", async () => {
    const { id } = await ingestSubmission(body({ consent: false }), secret);
    await expect(approveSubmission(id, owner)).rejects.toThrow(/didn't agree/);
    await expect(rejectSubmission(id, " ", owner)).rejects.toThrow(/note/);
    await rejectSubmission(id, "No consent", owner);
    expect(await listSubmissions("rejected")).toMatchObject([{ id, reviewNote: "No consent" }]);
  });

  it("hides an approved project from the collection and the bundle", async () => {
    const { id } = await ingestSubmission(body(), secret);
    const showcaseId = await approveSubmission(id, owner);
    await hideSubmission(id, owner);
    expect(await firestoreDoc(`showcase/${showcaseId}`)).toBeNull();
    expect((await firestoreDoc<{ showcase: unknown[] }>("bundles/edition-2025"))?.showcase).toEqual([]);
    expect(await listSubmissions("hidden")).toHaveLength(1);
  });
});

describe("retention", () => {
  it("drops contact details 60 days after the edition ends", async () => {
    const { pruneContacts } = await import("./retention");
    const { id } = await ingestSubmission(body(), secret);
    const ended = Date.parse("2025-11-16T12:00:00.000Z");
    expect(await pruneContacts(ended + 59 * 86_400_000)).toBe(0);
    expect(await pruneContacts(ended + 61 * 86_400_000)).toBe(1);
    expect((await firestoreDoc(`cms/root/showcaseSubmissions/${id}`))?.contact).toBeUndefined();
  });
});
