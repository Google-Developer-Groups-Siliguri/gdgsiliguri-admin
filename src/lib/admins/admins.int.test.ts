import { beforeEach, describe, expect, it } from "vitest";

import { listAudit } from "@/lib/content/repository";
import { adminAuthFor, adminFirestoreFor } from "@/lib/firebase/admin-app";
import { resetEmulatorData } from "@/test/emulator-reset";

import { AdminError, addAdmin, changeRole, listAdmins, removeAdmin } from "./repository";

const owner = { email: "owner@example.com" };

async function seedOwner() {
  await adminFirestoreFor().collection("admins").doc(owner.email).set({
    email: owner.email,
    role: "owner",
    addedBy: "test",
  });
}

async function expectAdminError(promise: Promise<unknown>, code: AdminError["code"]) {
  const error = await promise.then(
    () => null,
    (caught: unknown) => caught,
  );
  expect(error).toBeInstanceOf(AdminError);
  expect((error as AdminError).code).toBe(code);
}

beforeEach(async () => {
  await resetEmulatorData();
  await adminFirestoreFor().collection("settings").doc("site").delete();
  await seedOwner();
});

describe("admin management", () => {
  it("adds admins with normalized emails and records who added them", async () => {
    await addAdmin("  New.Editor@Example.com ", "editor", owner);
    const added = (await listAdmins()).find((admin) => admin.email === "new.editor@example.com");
    expect(added).toMatchObject({ role: "editor", addedBy: owner.email });
    const { entries } = await listAudit({ limit: 1 });
    expect(entries[0]).toMatchObject({ action: "admin_add", summary: "Added new.editor@example.com as editor" });
  });

  it("rejects duplicates and bad emails", async () => {
    await expectAdminError(addAdmin("owner@example.com", "editor", owner), "already_admin");
    await expectAdminError(addAdmin("not-an-email", "editor", owner), "invalid_email");
  });

  it("lists owners first", async () => {
    await addAdmin("a@example.com", "editor", owner);
    expect((await listAdmins()).map((admin) => admin.role)).toEqual(["owner", "editor"]);
  });

  it("changes roles but never demotes the last owner", async () => {
    await expectAdminError(changeRole(owner.email, "editor", owner), "last_owner");
    await addAdmin("second@example.com", "owner", owner);
    await changeRole(owner.email, "editor", { email: "second@example.com" });
    expect((await listAdmins()).find((admin) => admin.email === owner.email)?.role).toBe("editor");
  });

  it("removes admins, but not yourself and not the last owner", async () => {
    await addAdmin("editor@example.com", "editor", owner);
    await expectAdminError(removeAdmin(owner.email, owner), "self");
    await removeAdmin("editor@example.com", owner);
    expect((await listAdmins()).map((admin) => admin.email)).toEqual([owner.email]);
    await expectAdminError(removeAdmin(owner.email, { email: "someone-else@example.com" }), "last_owner");
  });

  it("revokes the sessions of someone who is removed", async () => {
    const user = await adminAuthFor()
      .getUserByEmail("gone@example.com")
      .catch(() => adminAuthFor().createUser({ email: "gone@example.com" }));
    await addAdmin("gone@example.com", "editor", owner);
    const before = Date.now();
    await removeAdmin("gone@example.com", owner);
    const after = await adminAuthFor().getUser(user.uid);
    expect(Date.parse(after.tokensValidAfterTime!)).toBeGreaterThanOrEqual(before - 1000);
  });
});
