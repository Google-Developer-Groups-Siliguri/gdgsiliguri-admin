import "server-only";

import { FieldValue, type Timestamp } from "firebase-admin/firestore";

import { isRole, normalizeEmail, type Role } from "@/lib/auth/roles";
import { adminsRef } from "@/lib/cms/paths";
import { writeAudit, type Actor } from "@/lib/cms/repository";
import { adminAuthFor, adminFirestoreFor } from "@/lib/firebase/admin-app";

export type AdminSummary = {
  email: string;
  role: Role;
  displayName: string | null;
  photoURL: string | null;
  addedBy: string;
  addedAt: string | null;
  lastLoginAt: string | null;
};

export class AdminError extends Error {
  constructor(
    message: string,
    readonly code: "invalid_email" | "already_admin" | "not_found" | "last_owner" | "self",
  ) {
    super(message);
    this.name = "AdminError";
  }
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const admins = () => adminsRef(adminFirestoreFor());

function iso(value: Timestamp | undefined): string | null {
  return value ? value.toDate().toISOString() : null;
}

export async function listAdmins(): Promise<AdminSummary[]> {
  const snapshot = await admins().get();
  return snapshot.docs
    .map((doc) => {
      const data = doc.data();
      return {
        email: doc.id,
        role: isRole(data.role) ? data.role : "editor",
        displayName: data.displayName ?? null,
        photoURL: data.photoURL ?? null,
        addedBy: data.addedBy ?? "",
        addedAt: iso(data.addedAt),
        lastLoginAt: iso(data.lastLoginAt),
      } satisfies AdminSummary;
    })
    .sort((a, b) => (a.role === b.role ? a.email.localeCompare(b.email) : a.role === "owner" ? -1 : 1));
}

async function revokeSessions(email: string): Promise<void> {
  try {
    const user = await adminAuthFor().getUserByEmail(email);
    await adminAuthFor().revokeRefreshTokens(user.uid);
  } catch {
    return;
  }
}

export async function addAdmin(rawEmail: string, role: Role, actor: Actor): Promise<void> {
  const email = normalizeEmail(rawEmail);
  if (!EMAIL_PATTERN.test(email)) throw new AdminError("Enter a valid email address.", "invalid_email");
  if (!isRole(role)) throw new AdminError("Choose owner or editor.", "invalid_email");
  await adminFirestoreFor().runTransaction(async (transaction) => {
    const ref = admins().doc(email);
    if ((await transaction.get(ref)).exists) {
      throw new AdminError(`${email} is already an admin.`, "already_admin");
    }
    transaction.create(ref, { email, role, addedBy: actor.email, addedAt: FieldValue.serverTimestamp() });
  });
  await writeAudit(actor, "admin_add", `Added ${email} as ${role}`);
}

export async function changeRole(rawEmail: string, role: Role, actor: Actor): Promise<void> {
  const email = normalizeEmail(rawEmail);
  if (!isRole(role)) throw new AdminError("Choose owner or editor.", "invalid_email");
  const previous = await adminFirestoreFor().runTransaction(async (transaction) => {
    const ref = admins().doc(email);
    const snapshot = await transaction.get(ref);
    if (!snapshot.exists) throw new AdminError(`${email} is not an admin.`, "not_found");
    const current = snapshot.get("role") as Role;
    if (current === role) return current;
    if (current === "owner") {
      const owners = await transaction.get(admins().where("role", "==", "owner"));
      if (owners.size <= 1) {
        throw new AdminError("There must always be at least one owner.", "last_owner");
      }
    }
    transaction.update(ref, { role });
    return current;
  });
  if (previous !== role) {
    await writeAudit(actor, "admin_role", `Changed ${email} from ${previous} to ${role}`);
  }
}

export async function removeAdmin(rawEmail: string, actor: Actor): Promise<void> {
  const email = normalizeEmail(rawEmail);
  if (email === normalizeEmail(actor.email)) {
    throw new AdminError("You can't remove yourself. Ask another owner.", "self");
  }
  await adminFirestoreFor().runTransaction(async (transaction) => {
    const ref = admins().doc(email);
    const snapshot = await transaction.get(ref);
    if (!snapshot.exists) throw new AdminError(`${email} is not an admin.`, "not_found");
    if (snapshot.get("role") === "owner") {
      const owners = await transaction.get(admins().where("role", "==", "owner"));
      if (owners.size <= 1) {
        throw new AdminError("There must always be at least one owner.", "last_owner");
      }
    }
    transaction.delete(ref);
  });
  await revokeSessions(email);
  await writeAudit(actor, "admin_remove", `Removed ${email}`);
}
