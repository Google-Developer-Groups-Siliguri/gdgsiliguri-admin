import "server-only";

import { FieldValue, type Timestamp } from "firebase-admin/firestore";

import { adminsRef } from "@/lib/cms/paths";
import { adminFirestore } from "@/lib/firebase/admin";

import { isRole, normalizeEmail, type Role } from "./roles";

export type AdminRecord = {
  email: string;
  role: Role;
  displayName?: string | null;
  photoURL?: string | null;
  addedBy: string;
  addedAt: Timestamp;
  lastLoginAt?: Timestamp;
};

export const adminsCollection = () => adminsRef(adminFirestore());

const legacyAdminsCollection = () => adminFirestore().collection("admins");

async function findAdminSnapshot(email: string) {
  const id = normalizeEmail(email);
  const moved = await adminsCollection().doc(id).get();
  if (moved.exists) return moved;
  const legacy = await legacyAdminsCollection().doc(id).get();
  return legacy.exists ? legacy : null;
}

export async function findAdmin(email: string): Promise<AdminRecord | null> {
  const data = (await findAdminSnapshot(email))?.data();
  if (!data || !isRole(data.role)) return null;
  return data as AdminRecord;
}

export async function recordLogin(
  email: string,
  profile: { displayName: string | null; photoURL: string | null },
): Promise<void> {
  const snapshot = await findAdminSnapshot(email);
  if (!snapshot) return;
  await snapshot.ref.update({
    lastLoginAt: FieldValue.serverTimestamp(),
    ...(profile.displayName ? { displayName: profile.displayName } : {}),
    ...(profile.photoURL ? { photoURL: profile.photoURL } : {}),
  });
}
