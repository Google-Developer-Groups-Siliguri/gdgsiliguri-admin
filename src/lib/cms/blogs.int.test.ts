import { readFileSync } from "node:fs";

import { beforeEach, describe, expect, it } from "vitest";

import { firestoreDoc, resetV2Data } from "@/test/v2-reset";

import { hideBlog, readBlogSettings, setBlogPinned, syncBlogs } from "./blogs";
import { listAudit } from "./repository";

const xml = readFileSync(new URL("../integrations/fixtures/hashnode-rss.xml", import.meta.url), "utf8");
const actor = { email: "editor@example.com" };
const feed = async () => new Response(xml);
const SLUG = "getting-started-with-gemini-in-flutter";

beforeEach(async () => {
  await resetV2Data();
});

describe("blog sync", () => {
  it("adds the posts, rebuilds bundles/home and records the result", async () => {
    expect(await syncBlogs(actor, { fetcher: feed })).toEqual({ added: 2, updated: 0, unchanged: 0, skipped: 0 });
    expect(await firestoreDoc(`blogs/${SLUG}`)).toMatchObject({ pinned: false, source: "hashnode" });
    const home = (await firestoreDoc<{ blogs: { id: string }[] }>("bundles/home"))!;
    expect(home.blogs.map((blog) => blog.id)).toEqual([SLUG, "devfest-siliguri-2025-recap"]);
    expect((await readBlogSettings()).lastSyncResult).toMatchObject({ added: 2 });
    expect((await listAudit({ action: "blog_sync", limit: 1 })).entries[0].summary).toBe(
      "Synced blog posts: 2 new, 0 updated",
    );
  });

  it("keeps a pin across syncs and doesn't re-add a hidden post", async () => {
    await syncBlogs(actor, { fetcher: feed });
    await setBlogPinned("devfest-siliguri-2025-recap", true, actor);
    await hideBlog(SLUG, actor);

    expect(await syncBlogs(actor, { fetcher: feed })).toEqual({ added: 0, updated: 0, unchanged: 1, skipped: 1 });
    expect(await firestoreDoc(`blogs/${SLUG}`)).toBeNull();
    expect((await firestoreDoc("blogs/devfest-siliguri-2025-recap"))?.pinned).toBe(true);
    const home = (await firestoreDoc<{ blogs: { id: string; pinned: boolean }[] }>("bundles/home"))!;
    expect(home.blogs).toEqual([expect.objectContaining({ id: "devfest-siliguri-2025-recap", pinned: true })]);
  });

  it("records a failed fetch without touching the posts", async () => {
    const result = await syncBlogs(actor, { fetcher: async () => new Response("down", { status: 503 }) });
    expect(result.error).toBe("The feed answered 503");
    expect((await readBlogSettings()).lastSyncResult?.error).toBe("The feed answered 503");
  });
});
