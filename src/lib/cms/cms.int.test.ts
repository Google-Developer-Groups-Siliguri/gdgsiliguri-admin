import { initializeApp } from "firebase-admin/app";
import { getDatabase } from "firebase-admin/database";
import type { Timestamp } from "firebase-admin/firestore";
import { beforeEach, describe, expect, it } from "vitest";

import { adminFirestoreFor } from "@/lib/firebase/admin-app";
import { homeBundle, editionBundle, editionsBundle } from "@/lib/schema/v2/bundles";
import { fromFirestore } from "@/lib/schema/v2/convert";
import { firestoreDoc, migrationActor, resetV2Data, rtdbValue } from "@/test/v2-reset";
import { seed } from "./test-data";

import { ContentError } from "./errors";
import { driftRef, legacySyncRef, sectionRef } from "./paths";
import { publish, toggleSection } from "./publish";
import { discardDraft, getSection, listAudit, listRevisions, revertToRevision, saveDraft } from "./repository";
import { readLegacySyncState, syncLegacy } from "./sync";

const editor = { email: "editor@example.com" };
const owner = { email: "owner@example.com" };

type Items = { items: Record<string, unknown>[] };

async function expectContentError(promise: Promise<unknown>, code: ContentError["code"]) {
  const error = await promise.then(
    () => null,
    (caught: unknown) => caught,
  );
  expect(error).toBeInstanceOf(ContentError);
  expect((error as ContentError).code).toBe(code);
  return error as ContentError;
}

async function bundle(id: string) {
  return fromFirestore<Record<string, unknown>>(await firestoreDoc(`bundles/${id}`));
}

function deadDatabase() {
  const emulatorHost = process.env.FIREBASE_DATABASE_EMULATOR_HOST;
  process.env.FIREBASE_DATABASE_EMULATOR_HOST = "127.0.0.1:9";
  try {
    const app = initializeApp(
      { projectId: "demo-gdg-siliguri", databaseURL: "http://127.0.0.1:9?ns=unreachable" },
      `dead-${Date.now()}`,
    );
    return getDatabase(app);
  } finally {
    process.env.FIREBASE_DATABASE_EMULATOR_HOST = emulatorHost;
  }
}

beforeEach(async () => {
  await resetV2Data();
});

describe("migration", () => {
  it("creates every section at version 1 with the draft equal to published", async () => {
    const partners = await getSection("edition-2026-partners");
    expect(partners).toMatchObject({ version: 1, draftVersion: 1, hasDraftChanges: false });
    expect((partners.draft as Items).items).toHaveLength(11);
    expect(await listRevisions("edition-2025-sessions")).toMatchObject([
      { version: 1, note: "Migrated from RTDB (test)", itemCount: 12 },
    ]);
  });

  it("writes public docs with Timestamps and no ids", async () => {
    const session = await firestoreDoc<{ startAt: Timestamp; id?: string }>(
      "editions/2025/sessions/supercharge-app-dev-with-gen-ai-utilery-1000",
    );
    expect(session?.startAt.toDate().toISOString()).toBe("2025-11-16T04:30:00.000Z");
    expect(session).not.toHaveProperty("id");
    expect((await firestoreDoc("site/config"))?.activeEdition).toBe(2026);
  });

  it("builds bundles that pass their schemas", async () => {
    expect(homeBundle.safeParse(await bundle("home")).success).toBe(true);
    expect(editionBundle.safeParse(await bundle("edition-2026")).success).toBe(true);
    expect(editionBundle.safeParse(await bundle("edition-2025")).success).toBe(true);
    expect(editionsBundle.safeParse(await bundle("editions")).success).toBe(true);
  });

  it("leaves RTDB alone and remembers its current hashes", async () => {
    expect(await rtdbValue("teams")).toEqual(seed.teams);
    const sync = await readLegacySyncState();
    expect(Object.keys(sync.lastHashes)).toContain("eventDetails");
    expect(sync.pending).toEqual({});
  });
});

describe("drafts", () => {
  it("rejects a second save with the same expected draft version", async () => {
    const faqs = await getSection("faqs");
    const draft = (n: number) => ({
      items: [...(faqs.draft as Items).items, { question: `Q${n}`, answer: "A", order: 99 }],
    });
    const results = await Promise.allSettled([
      saveDraft("faqs", draft(1), faqs.draftVersion, editor),
      saveDraft("faqs", draft(2), faqs.draftVersion, owner),
    ]);
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    const rejected = results.find((result) => result.status === "rejected") as PromiseRejectedResult;
    expect((rejected.reason as ContentError).code).toBe("stale_draft");
    expect((await getSection("faqs")).draftVersion).toBe(2);
  });

  it("gives new items an id and leaves the live data alone", async () => {
    const team = await getSection("team");
    const added = {
      name: "Ada Lovelace",
      role: "organizer",
      photo: { url: "https://ik.imagekit.io/x/ada.png" },
      order: 999,
    };
    const saved = await saveDraft("team", { items: [...(team.draft as Items).items, added] }, 1, editor);
    expect((saved.draft as Items).items.at(-1)).toMatchObject({ id: "ada-lovelace", name: "Ada Lovelace" });
    expect(saved.hasDraftChanges).toBe(true);
    expect(await firestoreDoc("team/ada-lovelace")).toBeNull();
  });

  it("coalesces repeated saves by the same person into one audit entry", async () => {
    const faqs = await getSection("faqs");
    const first = await saveDraft("faqs", faqs.draft, faqs.draftVersion, editor);
    await saveDraft("faqs", first.draft, first.draftVersion, editor);
    const { entries } = await listAudit({ sectionId: "faqs" });
    expect(entries.filter((entry) => entry.action === "save_draft")).toHaveLength(1);
  });

  it("discard restores the published value and is audited", async () => {
    const faqs = await getSection("faqs");
    await saveDraft("faqs", { items: [] }, faqs.draftVersion, editor);
    const discarded = await discardDraft("faqs", editor);
    expect(discarded.hasDraftChanges).toBe(false);
    expect((await listAudit({ sectionId: "faqs", limit: 1 })).entries[0].action).toBe("discard");
  });
});

describe("publish", () => {
  async function renamePartner(name: string) {
    const partners = await getSection("edition-2026-partners");
    const items = structuredClone((partners.draft as Items).items);
    items[0] = { ...items[0], name };
    return saveDraft("edition-2026-partners", { items }, partners.draftVersion, editor);
  }

  it("writes public docs, bundles, revision, audit and RTDB", async () => {
    await renamePartner("GDG on Campus JGEC");
    const result = await publish("edition-2026-partners", 1, editor, { note: "Shorter name" });

    expect(result.warnings).toEqual([]);
    expect(result.state).toMatchObject({ version: 2, hasDraftChanges: false });
    expect(result.bundles).toEqual(["home", "edition-2026"]);
    const doc = await firestoreDoc<{ name: string; updatedAt: Timestamp }>(
      "editions/2026/partners/gdg-on-campus-jalpaiguri-govt-engineering-college",
    );
    expect(doc?.name).toBe("GDG on Campus JGEC");
    expect(((await bundle("home")).partners as { name: string }[])[0].name).toBe("GDG on Campus JGEC");
    expect(((await bundle("edition-2026")).partners as { name: string }[])[0].name).toBe("GDG on Campus JGEC");
    expect((await bundle("edition-2026")).sourceVersions).toMatchObject({ "edition-2026-partners": 2 });
    expect(await listRevisions("edition-2026-partners")).toMatchObject([
      { version: 2, note: "Shorter name" },
      { version: 1 },
    ]);
    expect((await listAudit({ sectionId: "edition-2026-partners", limit: 1 })).entries[0]).toMatchObject({
      action: "publish",
      summary: "Published 2026 · Community partners (11 items)",
    });
    const live = (await rtdbValue("communityPartners")) as { data: { communityName: string }[] };
    expect(live.data[0].communityName).toBe("GDG on Campus JGEC");
    expect((await readLegacySyncState()).pending).toEqual({});
  });

  it("deletes docs that were removed from the draft", async () => {
    const faqs = await getSection("faqs");
    const [first, ...rest] = (faqs.draft as Items).items;
    await saveDraft("faqs", { items: rest }, faqs.draftVersion, editor);
    await publish("faqs", 1, editor);
    expect(await firestoreDoc(`faqs/${first.id as string}`)).toBeNull();
    expect(((await rtdbValue("home/gdgFAQs")) as { data: unknown[] }).data).toHaveLength(rest.length);
  });

  it("rejects an invalid draft without writing anything", async () => {
    const faqs = await getSection("faqs");
    await saveDraft("faqs", { items: [...(faqs.draft as Items).items, { question: "", answer: "" }] }, 1, editor);
    const error = await expectContentError(publish("faqs", 1, editor), "invalid");
    expect(error.issues.map((issue) => issue.message)).toContain("Question is required");
    expect((await getSection("faqs")).version).toBe(1);
    expect(
      await adminFirestoreFor()
        .doc("cms/root/sections/faqs")
        .get()
        .then((doc) => doc.get("publishLock")),
    ).toBeUndefined();
  });

  it("checks session speakers against the published speakers", async () => {
    const sessions = await getSection("edition-2025-sessions");
    const items = structuredClone((sessions.draft as Items).items);
    items[1] = { ...items[1], speakerIds: ["nobody"] };
    await saveDraft("edition-2025-sessions", { items }, 1, editor);
    const error = await expectContentError(publish("edition-2025-sessions", 1, editor), "invalid");
    expect(error.issues[0]).toMatchObject({ path: ["items", 1, "speakerIds", 0] });
  });

  it("refuses a stale version and a publish already in progress", async () => {
    await renamePartner("A");
    await publish("edition-2026-partners", 1, editor);
    await expectContentError(publish("edition-2026-partners", 1, editor), "stale_version");

    await sectionRef(adminFirestoreFor(), "faqs").update({
      publishLock: { id: "other", by: owner.email, expiresAt: new Date(Date.now() + 60_000) },
    });
    await expectContentError(publish("faqs", 1, editor), "publish_in_progress");
  });

  it("refuses a bundle over 800 KB", async () => {
    const faqs = await getSection("edition-2026-faqs");
    const long = "x".repeat(4_900);
    const items = Array.from({ length: 180 }, (_, index) => ({ question: `Q${index}`, answer: long, order: index }));
    await saveDraft("edition-2026-faqs", { items: [...(faqs.draft as Items).items, ...items] }, 1, editor);
    await expectContentError(publish("edition-2026-faqs", 1, editor), "bundle_too_large");
    expect((await getSection("edition-2026-faqs")).version).toBe(1);
  });

  it("still succeeds when RTDB is unreachable and keeps the node pending", async () => {
    process.env.LEGACY_RTDB_TIMEOUT_MS = "1000";
    await renamePartner("Offline");
    const result = await publish("edition-2026-partners", 1, editor, { legacyDatabase: deadDatabase() });
    expect(result.warnings).toEqual(["legacy_sync_pending"]);
    expect(result.state.version).toBe(2);
    const pending = (await readLegacySyncState()).pending.communityPartners;
    expect(pending).toMatchObject({ attempts: 1, lastError: expect.stringMatching(/timed out/) });

    const retried = await syncLegacy("pending", editor);
    expect(retried.synced).toEqual(["communityPartners"]);
    expect((await readLegacySyncState()).pending).toEqual({});
    expect(
      ((await rtdbValue("communityPartners")) as { data: { communityName: string }[] }).data[0].communityName,
    ).toBe("Offline");
  }, 30_000);
});

describe("legacy sync drift", () => {
  it("records a manual RTDB edit, saves it and restores the generated node", async () => {
    await syncLegacy(["feedbacks"], editor);
    await (await import("@/lib/firebase/admin-app")).adminDatabaseFor().ref("feedbacks/enabled").set(false);

    const result = await syncLegacy(["feedbacks"], editor);
    expect(result.drift).toEqual(["feedbacks"]);
    expect(((await rtdbValue("feedbacks")) as { enabled: boolean }).enabled).toBe(true);
    const saved = await driftRef(adminFirestoreFor()).get();
    expect(saved.docs.map((doc) => JSON.parse(doc.get("json")).enabled)).toEqual([false]);
    const { entries } = await listAudit({ action: "legacy_sync" });
    expect(entries[0].summary).toBe("Overwrote a manual RTDB edit at /feedbacks");
  });

  it("brings RTDB to the new shape for 2026 on a full sync", async () => {
    await syncLegacy("all", migrationActor);
    expect(await rtdbValue("schedule")).toEqual({ enabled: false });
    expect(await rtdbValue("speakers")).toEqual({ enabled: false });
    expect(await rtdbValue("sponsors")).toEqual({ enabled: false });
    const details = (await rtdbValue("eventDetails")) as Record<string, unknown>;
    expect(details).toMatchObject({ eventDateTime: "2026-11-14 08:00:00.000", eventTicketURL: "", eventMode: true });
    expect(
      await legacySyncRef(adminFirestoreFor())
        .get()
        .then((doc) => doc.get("lastSyncedAt")),
    ).toBeDefined();
  });
});

describe("toggle", () => {
  it("turns partners off through the edition doc and leaves other draft fields alone", async () => {
    const result = await toggleSection("edition-2026-partners", false, editor);
    expect(result.state.id).toBe("edition-2026");
    expect((await bundle("edition-2026")).partners).toEqual([]);
    expect((await bundle("home")).partners).toEqual([]);
    expect(((await rtdbValue("communityPartners")) as { enabled: boolean }).enabled).toBe(false);
    const edition = await getSection("edition-2026");
    expect((edition.published.sections as Record<string, boolean>).partners).toBe(false);
    expect(edition.published.title).toBe("DevFest Siliguri 2026");
    expect((await listAudit({ sectionId: "edition-2026", limit: 1 })).entries[0]).toMatchObject({
      action: "toggle",
      summary: "Turned 2026 · Community partners off",
    });
  });

  it("refuses while the owning doc has unpublished edits", async () => {
    const edition = await getSection("edition-2026");
    await saveDraft("edition-2026", { ...edition.draft, title: "Changed" }, 1, editor);
    const error = await expectContentError(toggleSection("edition-2026-faqs", false, editor), "owner_has_draft");
    expect(error.message).toBe("Publish or discard the pending 2026 · Event changes first.");
  });

  it("refuses to turn on a section with nothing published", async () => {
    const error = await expectContentError(toggleSection("edition-2026-speakers", true, editor), "invalid");
    expect(error.issues[0]).toMatchObject({ path: ["sections", "speakers"] });
  });

  it("toggles community sections through site settings", async () => {
    await toggleSection("testimonials", false, owner);
    expect((await bundle("home")).testimonials).toEqual([]);
    expect(((await rtdbValue("feedbacks")) as { enabled: boolean }).enabled).toBe(false);
  });

  it("is not available for the edition doc itself", async () => {
    await expectContentError(toggleSection("edition-2026", false, editor), "not_toggleable");
  });
});

describe("revert", () => {
  it("loads an old revision into the draft and keeps the current on/off switches", async () => {
    const [migrated] = await listRevisions("edition-2026");
    await toggleSection("edition-2026-faqs", false, editor);
    const edition = await getSection("edition-2026");
    await saveDraft("edition-2026", { ...edition.draft, title: "Renamed" }, edition.draftVersion, editor);
    await publish("edition-2026", edition.version, editor);

    const reverted = await revertToRevision("edition-2026", migrated.id, owner);
    expect(reverted.draft.title).toBe("DevFest Siliguri 2026");
    expect((reverted.draft.sections as Record<string, boolean>).faqs).toBe(false);
    expect(reverted.published.title).toBe("Renamed");
  });
});
