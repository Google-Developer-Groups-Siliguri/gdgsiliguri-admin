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

export async function findAdmin(email: string): Promise<AdminRecord | null> {
  const snapshot = await adminsCollection().doc(normalizeEmail(email)).get();
  const data = snapshot.data();
  if (!snapshot.exists || !data || !isRole(data.role)) return null;
  return data as AdminRecord;
}

export async function recordLogin(
  email: string,
  profile: { displayName: string | null; photoURL: string | null },
): Promise<void> {
  await adminsCollection()
    .doc(normalizeEmail(email))
    .update({
      lastLoginAt: FieldValue.serverTimestamp(),
      ...(profile.displayName ? { displayName: profile.displayName } : {}),
      ...(profile.photoURL ? { photoURL: profile.photoURL } : {}),
    });
}
