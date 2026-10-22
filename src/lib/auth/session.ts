import "server-only";

import { cookies } from "next/headers";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { cache } from "react";

import { adminAuth } from "@/lib/firebase/admin";

import { findAdmin } from "./admins";
import { LOGIN_PATH, SESSION_COOKIE } from "./constants";
import { hasRole, normalizeEmail, type AdminUser, type Role } from "./roles";

export class AuthorizationError extends Error {
  constructor(
    message: string,
    readonly reason: "signed_out" | "not_admin" | "forbidden",
  ) {
    super(message);
    this.name = "AuthorizationError";
  }
}

export const getCurrentAdmin = cache(async (): Promise<AdminUser | null> => {
  const sessionCookie = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!sessionCookie) return null;
  await connection();
  try {
    const claims = await adminAuth().verifySessionCookie(sessionCookie, true);
    if (!claims.email) return null;
    const record = await findAdmin(claims.email);
    if (!record) return null;
    return {
      uid: claims.uid,
      email: normalizeEmail(claims.email),
      role: record.role,
      displayName: record.displayName ?? (claims.name as string | undefined) ?? null,
      photoURL: record.photoURL ?? (claims.picture as string | undefined) ?? null,
    };
  } catch {
    return null;
  }
});

export async function requireAdmin(role: Role = "editor"): Promise<AdminUser> {
  const user = await getCurrentAdmin();
  if (!user) throw new AuthorizationError("Your session has expired. Sign in again.", "signed_out");
  if (!hasRole(user, role)) {
    throw new AuthorizationError("Only owners can do this.", "forbidden");
  }
  return user;
}

export async function requireAdminPage(role: Role = "editor"): Promise<AdminUser> {
  const user = await getCurrentAdmin();
  if (!user) redirect(LOGIN_PATH);
  if (!hasRole(user, role)) redirect("/");
  return user;
}
