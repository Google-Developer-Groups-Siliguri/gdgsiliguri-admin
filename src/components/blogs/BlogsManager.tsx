"use client";

import { useTransition } from "react";

import { RelativeTime } from "@/components/RelativeTime";
import { ItemThumbnail } from "@/components/section/ItemThumbnail";
import { Button } from "@/components/m3/Button";
import { Card } from "@/components/m3/Card";
import { IconButton } from "@/components/m3/IconButton";
import { useSnackbar } from "@/components/m3/Snackbar";
import { hideBlogAction, pinBlogAction, syncBlogsAction } from "@/lib/cms/blog-actions";
import type { BlogSyncResult } from "@/lib/cms/blogs";
import type { Blog } from "@/lib/schema/v2";

type BlogsManagerProps = {
  posts: Blog[];
  hiddenSlugs: string[];
  lastSyncAt: string | null;
  lastSyncResult: BlogSyncResult | null;
};

export function BlogsManager({ posts, hiddenSlugs, lastSyncAt, lastSyncResult }: BlogsManagerProps) {
  const showSnackbar = useSnackbar();
  const [pending, startTransition] = useTransition();

  function act(task: () => Promise<{ ok: boolean; message?: string }>, success: string) {
    startTransition(async () => {
      const result = await task();
      showSnackbar(result.ok ? { message: success } : { message: result.message ?? "Failed.", tone: "error" });
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <Card variant="tinted" className="flex flex-wrap items-center gap-4 rounded-[28px] bg-surface-container p-5">
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="text-title-medium text-on-surface">Posts come from gdgsiliguri.hashnode.dev</span>
          <span className="text-body-small text-on-surface-variant">
            {lastSyncAt ? (
              <>
                Last synced <RelativeTime iso={lastSyncAt} />
                {lastSyncResult?.error ? ` · failed: ${lastSyncResult.error}` : ""}
              </>
            ) : (
              "Never synced"
            )}
            . The dashboard syncs again when it is more than 6 hours old.
          </span>
        </div>
        <Button
          icon="sync"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const result = await syncBlogsAction();
              if (!result.ok) showSnackbar({ message: result.message, tone: "error" });
              else if (result.data.error) showSnackbar({ message: `Sync failed: ${result.data.error}`, tone: "error" });
              else showSnackbar({ message: `Synced: ${result.data.added} new, ${result.data.updated} updated.` });
            })
          }
        >
          {pending ? "Syncing…" : "Sync now"}
        </Button>
      </Card>

      {posts.length === 0 ? (
        <p className="rounded-lg bg-surface-container px-5 py-6 text-body-medium text-on-surface-variant">
          No posts yet. Use Sync now to fetch them.
        </p>
      ) : (
        <ol className="segmented-list" aria-label="Blog posts">
          {posts.map((post) => (
            <li key={post.id} className="flex items-center gap-3 px-4 py-3">
              <ItemThumbnail src={post.cover?.url ?? ""} />
              <div className="flex min-w-0 flex-1 flex-col">
                <a
                  href={post.url}
                  target="_blank"
                  rel="noreferrer"
                  className="truncate font-display text-[17px] font-bold text-on-surface hover:underline"
                >
                  {post.title}
                </a>
                <span className="truncate text-body-small text-on-surface-variant">
                  {post.author.name} · <RelativeTime iso={post.publishedAt} />
                  {post.pinned ? " · Pinned" : ""}
                </span>
              </div>
              <IconButton
                icon="push_pin"
                label={post.pinned ? `Unpin ${post.title}` : `Pin ${post.title}`}
                disabled={pending}
                onClick={() =>
                  act(() => pinBlogAction(post.id, !post.pinned), post.pinned ? "Unpinned." : "Pinned to the top.")
                }
              />
              <IconButton
                icon="visibility_off"
                label={`Hide ${post.title}`}
                disabled={pending}
                onClick={() => act(() => hideBlogAction(post.id, true), "Hidden from the website and the app.")}
              />
            </li>
          ))}
        </ol>
      )}

      {hiddenSlugs.length > 0 && (
        <section className="flex flex-col gap-2" aria-label="Hidden posts">
          <h2 className="px-1 text-title-small text-on-surface">Hidden posts</h2>
          <ul className="flex flex-wrap gap-2">
            {hiddenSlugs.map((slug) => (
              <li key={slug}>
                <Button
                  variant="tonal"
                  icon="visibility"
                  disabled={pending}
                  onClick={() => act(() => hideBlogAction(slug, false), "It comes back on the next sync.")}
                >
                  Unhide {slug}
                </Button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
