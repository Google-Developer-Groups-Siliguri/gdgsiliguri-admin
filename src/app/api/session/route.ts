import { NextResponse } from "next/server";

import { findAdmin, recordLogin } from "@/lib/auth/admins";
import { SESSION_COOKIE, SESSION_MAX_AGE_MS } from "@/lib/auth/constants";
import { isSameOrigin } from "@/lib/auth/same-origin";
import { adminAuth } from "@/lib/firebase/admin";

const RECENT_SIGN_IN_SECONDS = 5 * 60;

function failure(status: number, error: string, message: string) {
  return NextResponse.json({ error, message }, { status });
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return failure(403, "bad_origin", "Request origin not allowed.");

  const body = (await request.json().catch(() => null)) as { idToken?: unknown } | null;
  if (typeof body?.idToken !== "string") {
    return failure(400, "bad_request", "Missing ID token.");
  }

  let decoded;
  try {
    decoded = await adminAuth().verifyIdToken(body.idToken, true);
  } catch {
    return failure(401, "invalid_token", "Sign-in could not be verified. Try again.");
  }

  if (Date.now() / 1000 - decoded.auth_time > RECENT_SIGN_IN_SECONDS) {
    return failure(401, "stale_sign_in", "Please sign in again.");
  }
  if (!decoded.email || decoded.email_verified !== true) {
    return failure(403, "not_admin", "Your Google account has no verified email address.");
  }

  const admin = await findAdmin(decoded.email);
  if (!admin) {
    return failure(403, "not_admin", "You are not an admin. Ask an organizer to add you.");
  }

  const sessionCookie = await adminAuth().createSessionCookie(body.idToken, {
    expiresIn: SESSION_MAX_AGE_MS,
  });
  await recordLogin(decoded.email, {
    displayName: (decoded.name as string | undefined) ?? null,
    photoURL: (decoded.picture as string | undefined) ?? null,
  });

  const response = NextResponse.json({ ok: true, role: admin.role });
  response.cookies.set(SESSION_COOKIE, sessionCookie, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_MS / 1000,
  });
  return response;
}
