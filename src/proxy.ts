import { NextResponse, type NextRequest } from "next/server";

import { LOGIN_PATH, PUBLIC_PATH_PREFIXES, SESSION_COOKIE } from "@/lib/auth/constants";
import { adminAuth } from "@/lib/firebase/admin";

function isPublic(pathname: string): boolean {
  if (process.env.NODE_ENV !== "production" && pathname.startsWith("/dev/")) return true;
  return PUBLIC_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

async function hasValidSession(request: NextRequest): Promise<boolean> {
  const sessionCookie = request.cookies.get(SESSION_COOKIE)?.value;
  if (!sessionCookie) return false;
  try {
    await adminAuth().verifySessionCookie(sessionCookie);
    return true;
  } catch {
    return false;
  }
}

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  if (isPublic(pathname)) return NextResponse.next();
  if (await hasValidSession(request)) return NextResponse.next();

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "signed_out" }, { status: 401 });
  }
  const loginUrl = new URL(LOGIN_PATH, request.url);
  if (pathname !== "/") loginUrl.searchParams.set("next", `${pathname}${search}`);
  const response = NextResponse.redirect(loginUrl);
  response.cookies.set(SESSION_COOKIE, "", { path: "/", maxAge: 0 });
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|webp|ico|woff2)$).*)"],
};
