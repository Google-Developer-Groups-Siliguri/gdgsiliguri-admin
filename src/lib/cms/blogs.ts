import "server-only";

import { FieldValue, type Timestamp } from "firebase-admin/firestore";

import { HASHNODE_RSS_URL, parseHashnodeRss, type FeedPost } from "@/lib/integrations/hashnode";
import { strict, type Blog } from "@/lib/schema/v2";
import { fromFirestore, toFirestore } from "@/lib/schema/v2/convert";
import { deepEqual } from "@/lib/deep-equal";

import { ContentError } from "./errors";
import { auditRef, settingsRef } from "./paths";
import { rebuildBundles } from "./publish";
import { auditEntry, db, type Actor } from "./repository";

export const BLOG_SYNC_STALE_MS = 6 * 3600_000;

export type BlogSyncResult = { added: number; updated: number; unchanged: number; skipped: number; error?: string };

type Fetcher = (url: string, init?: RequestInit) => Promise<Response>;

const blogs = () => db().collection("blogs");

function comparable(post: Partial<Blog>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(fromFirestore<Record<string, unknown>>(toFirestore(post))).filter(
      ([key]) => key !== "pinned" && key !== "updatedAt" && key !== "id",
    ),
  );
}

export async function readBlogSettings() {
  const data = (await settingsRef(db(), "blogs").get()).data() ?? {};
  return {
    hiddenSlugs: (data.hiddenSlugs as string[] | undefined) ?? [],
    lastSyncAt: (data.lastSyncAt as Timestamp | undefined)?.toDate().toISOString() ?? null,
    lastSyncResult: (data.lastSyncResult as BlogSyncResult | undefined) ?? null,
  };
}

export async function listBlogs(): Promise<Blog[]> {
  const snapshot = await blogs().get();
  return snapshot.docs
    .map((doc) => ({ ...fromFirestore<Blog>(doc.data()), id: doc.id }))
    .sort((a, b) => Number(b.pinned) - Number(a.pinned) || Date.parse(b.publishedAt) - Date.parse(a.publishedAt));
}

export async function syncBlogs(
  actor: Actor,
  { fetcher = fetch as Fetcher, feedUrl = HASHNODE_RSS_URL }: { fetcher?: Fetcher; feedUrl?: string } = {},
): Promise<BlogSyncResult> {
  const result: BlogSyncResult = { added: 0, updated: 0, unchanged: 0, skipped: 0 };
  let posts: FeedPost[];
  try {
    const response = await fetcher(feedUrl, { signal: AbortSignal.timeout(15_000) });
    if (!response.ok) throw new Error(`The feed answered ${response.status}`);
    posts = parseHashnodeRss(await response.text());
  } catch (error) {
    const failed = { ...result, error: (error as Error).message };
    await settingsRef(db(), "blogs").set(
      { lastSyncAt: FieldValue.serverTimestamp(), lastSyncResult: failed },
      { merge: true },
    );
    return failed;
  }

  const { hiddenSlugs } = await readBlogSettings();
  const hidden = new Set(hiddenSlugs);
  const existing = new Map((await listBlogs()).map((blog) => [blog.id, blog]));
  const batch = db().batch();
  for (const post of posts) {
    if (hidden.has(post.id)) {
      result.skipped += 1;
      continue;
    }
    const current = existing.get(post.id);
    const next: Blog = { ...post, pinned: current?.pinned ?? false };
    if (!strict.blog.safeParse(next).success) {
      result.skipped += 1;
      continue;
    }
    if (current && deepEqual(comparable(current), comparable(next))) {
      result.unchanged += 1;
      continue;
    }
    const { id, ...data } = next;
    batch.set(blogs().doc(id), { ...toFirestore(data), updatedAt: FieldValue.serverTimestamp() });
    if (current) result.updated += 1;
    else result.added += 1;
  }
  await batch.commit();
  if (result.added || result.updated) await rebuildBundles(["home"], actor);
  await settingsRef(db(), "blogs").set(
    { lastSyncAt: FieldValue.serverTimestamp(), lastSyncResult: result },
    { merge: true },
  );
  await auditRef(db()).add(
    auditEntry(actor, "blog_sync", `Synced blog posts: ${result.added} new, ${result.updated} updated`),
  );
  return result;
}

export async function syncBlogsIfStale(actor: Actor, now = Date.now()): Promise<BlogSyncResult | null> {
  const { lastSyncAt } = await readBlogSettings();
  if (lastSyncAt && now - Date.parse(lastSyncAt) < BLOG_SYNC_STALE_MS) return null;
  return syncBlogs(actor);
}

export async function setBlogPinned(slug: string, pinned: boolean, actor: Actor): Promise<void> {
  const ref = blogs().doc(slug);
  if (!(await ref.get()).exists) throw new ContentError("That post is not in the list.", "invalid");
  await ref.update({ pinned, updatedAt: FieldValue.serverTimestamp() });
  await rebuildBundles(["home"], actor);
  await auditRef(db()).add(auditEntry(actor, "blog_sync", `${pinned ? "Pinned" : "Unpinned"} the post ${slug}`));
}

export async function hideBlog(slug: string, actor: Actor): Promise<void> {
  await blogs().doc(slug).delete();
  await settingsRef(db(), "blogs").set({ hiddenSlugs: FieldValue.arrayUnion(slug) }, { merge: true });
  await rebuildBundles(["home"], actor);
  await auditRef(db()).add(auditEntry(actor, "blog_sync", `Hid the post ${slug}`));
}

export async function unhideBlog(slug: string, actor: Actor): Promise<void> {
  await settingsRef(db(), "blogs").set({ hiddenSlugs: FieldValue.arrayRemove(slug) }, { merge: true });
  await auditRef(db()).add(auditEntry(actor, "blog_sync", `Unhid the post ${slug}; it returns on the next sync`));
}
