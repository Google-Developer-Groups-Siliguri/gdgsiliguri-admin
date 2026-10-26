"use server";

import { refresh } from "next/cache";

import { AuthorizationError, requireAdmin } from "@/lib/auth/session";

import { hideBlog, setBlogPinned, syncBlogs, unhideBlog, type BlogSyncResult } from "./blogs";
import { ContentError } from "./errors";

export type BlogActionResult<T = null> = { ok: true; data: T } | { ok: false; message: string };

async function run<T>(task: (actor: { email: string }) => Promise<T>): Promise<BlogActionResult<T>> {
  try {
    const actor = await requireAdmin("editor");
    const data = await task(actor);
    refresh();
    return { ok: true, data };
  } catch (error) {
    if (error instanceof ContentError || error instanceof AuthorizationError)
      return { ok: false, message: error.message };
    console.error(error);
    return { ok: false, message: "Something went wrong. Try again." };
  }
}

const validSlug = (slug: unknown): slug is string => typeof slug === "string" && /^[\w-]{1,200}$/.test(slug);

export async function syncBlogsAction(): Promise<BlogActionResult<BlogSyncResult>> {
  return run((actor) => syncBlogs(actor));
}

export async function pinBlogAction(slug: string, pinned: boolean): Promise<BlogActionResult> {
  if (!validSlug(slug) || typeof pinned !== "boolean") return { ok: false, message: "Invalid request." };
  return run(async (actor) => {
    await setBlogPinned(slug, pinned, actor);
    return null;
  });
}

export async function hideBlogAction(slug: string, hidden: boolean): Promise<BlogActionResult> {
  if (!validSlug(slug) || typeof hidden !== "boolean") return { ok: false, message: "Invalid request." };
  return run(async (actor) => {
    if (hidden) await hideBlog(slug, actor);
    else await unhideBlog(slug, actor);
    return null;
  });
}
