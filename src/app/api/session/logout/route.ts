import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { SESSION_COOKIE } from "@/lib/auth/constants";
import { isSameOrigin } from "@/lib/auth/same-origin";
import { adminAuth } from "@/lib/firebase/admin";

export async function POST(request: Request) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: "bad_origin" }, { status: 403 });
  }
  const sessionCookie = (await cookies()).get(SESSION_COOKIE)?.value;
  if (sessionCookie) {
    await adminAuth()
      .verifySessionCookie(sessionCookie)
      .then((claims) => adminAuth().revokeRefreshTokens(claims.sub))
      .catch(() => undefined);
  }
  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, "", { path: "/", maxAge: 0 });
  return response;
}
