import { Timestamp } from "firebase-admin/firestore";
import { beforeEach, describe, expect, it } from "vitest";

import { adminFirestoreFor } from "@/lib/firebase/admin-app";
import { clearFirestore, firestoreDoc } from "@/test/v2-reset";

import { findAdmin, recordLogin } from "./admins";

const record = (email: string, role: string) => ({
  email,
  role,
  addedBy: "seed",
  addedAt: Timestamp.now(),
});

describe("admin lookup", () => {
  beforeEach(async () => {
    await clearFirestore();
  });

  it("finds an admin under cms/root/admins", async () => {
    await adminFirestoreFor().doc("cms/root/admins/moved@example.com").set(record("moved@example.com", "owner"));
    expect(await findAdmin("Moved@Example.com")).toMatchObject({ role: "owner" });
  });

  it("falls back to the top-level admins collection before move:cms runs", async () => {
    await adminFirestoreFor().doc("admins/legacy@example.com").set(record("legacy@example.com", "editor"));
    expect(await findAdmin("legacy@example.com")).toMatchObject({ role: "editor" });
    await recordLogin("legacy@example.com", { displayName: "Legacy", photoURL: null });
    expect(await firestoreDoc("admins/legacy@example.com")).toMatchObject({ displayName: "Legacy" });
    expect(await firestoreDoc("cms/root/admins/legacy@example.com")).toBeNull();
  });

  it("prefers the moved record over the legacy one", async () => {
    await adminFirestoreFor().doc("admins/both@example.com").set(record("both@example.com", "owner"));
    await adminFirestoreFor().doc("cms/root/admins/both@example.com").set(record("both@example.com", "editor"));
    expect(await findAdmin("both@example.com")).toMatchObject({ role: "editor" });
  });

  it("rejects an unknown email", async () => {
    expect(await findAdmin("nobody@example.com")).toBeNull();
  });
});
