import { NextResponse, type NextRequest } from "next/server";

import { LOGIN_PATH, PUBLIC_PATH_PREFIXES, SESSION_COOKIE } from "@/lib/auth/constants";

function isPublic(pathname: string): boolean {
  if (process.env.NODE_ENV !== "production" && pathname.startsWith("/dev/")) return true;
  return PUBLIC_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

function hasSessionCookie(request: NextRequest): boolean {
  return Boolean(request.cookies.get(SESSION_COOKIE)?.value);
}

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  if (isPublic(pathname)) return NextResponse.next();
  if (hasSessionCookie(request)) return NextResponse.next();

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
