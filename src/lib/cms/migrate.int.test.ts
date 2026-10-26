import { beforeEach, describe, expect, it } from "vitest";

import { adminDatabaseFor, adminFirestoreFor } from "@/lib/firebase/admin-app";
import { verifyParity } from "@/lib/legacy/verify";
import { clearFirestore, resetV2Data } from "@/test/v2-reset";

import { applyCmsMove, planCmsMove } from "../../../scripts/move-cms";

import { existingSections } from "./migrate";
import { listAudit } from "./repository";
import { syncLegacy } from "./sync";

describe("migrate:v2 on the seed", () => {
  beforeEach(async () => {
    await resetV2Data();
  });

  it("leaves only the allow-listed RTDB differences", async () => {
    const results = await verifyParity(adminFirestoreFor(), adminDatabaseFor());
    expect(results.flatMap((result) => result.unexpected)).toEqual([]);
    const allowed = Object.fromEntries(
      results
        .filter((result) => result.allowed.length)
        .map((result) => [result.node, result.allowed.map((diff) => diff.pointer)]),
    );
    expect(allowed).toEqual({
      schedule: ["/data"],
      speakers: ["/data"],
      sponsors: ["/gold", "/platinum"],
      "home/pastDevfests": ["/"],
      eventDetails: ["/registrationExpiryDateTime"],
    });
    expect(results.find((result) => result.node === "teams")?.cosmetic).toBeGreaterThan(0);
  });

  it("has no differences at all after a full legacy sync", async () => {
    await syncLegacy("all", { email: "test" });
    const results = await verifyParity(adminFirestoreFor(), adminDatabaseFor(), { normalize: false });
    expect(results.flatMap((result) => [...result.unexpected, ...result.allowed])).toEqual([]);
  });

  it("is detected as already done", async () => {
    expect(await existingSections(adminFirestoreFor())).toBe(1);
  });
});

describe("move:cms", () => {
  it("copies admins, settings and the audit log with section ids", async () => {
    await clearFirestore();
    const db = adminFirestoreFor();
    await db.doc("admins/owner@example.com").set({ email: "owner@example.com", role: "owner", addedBy: "test" });
    await db.doc("settings/site").set({ lastRebuildBy: "owner@example.com" });
    await db
      .doc("auditLog/a1")
      .set({
        at: new Date(),
        actorEmail: "x@example.com",
        action: "publish",
        summary: "s",
        sectionKey: "communityPartners",
      });
    await db.doc("auditLog/a2").set({ at: new Date(), actorEmail: "x@example.com", action: "admin_add", summary: "t" });

    await applyCmsMove(db, await planCmsMove(db));

    expect((await db.doc("cms/root/admins/owner@example.com").get()).get("role")).toBe("owner");
    expect((await db.doc("cms/root/settings/site").get()).get("lastRebuildBy")).toBe("owner@example.com");
    const moved = (await db.doc("cms/root/auditLog/a1").get()).data();
    expect(moved).toMatchObject({ sectionId: "edition-2026-partners" });
    expect(moved).not.toHaveProperty("sectionKey");
    expect((await listAudit({ sectionId: "edition-2026-partners" })).entries.map((entry) => entry.id)).toEqual(["a1"]);
    expect((await db.doc("admins/owner@example.com").get()).exists).toBe(true);
  });
});
