import { timingSafeEqual } from "node:crypto";

import { NextResponse } from "next/server";

import { syncBlogs } from "@/lib/cms/blogs";

function authorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  const sent = request.headers.get("x-cron-secret") ?? "";
  if (!secret || sent.length !== secret.length) return false;
  return timingSafeEqual(Buffer.from(sent), Buffer.from(secret));
}

export async function POST(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: "Not allowed." }, { status: 403 });
  return NextResponse.json(await syncBlogs({ email: "blog sync (cron)" }));
}
