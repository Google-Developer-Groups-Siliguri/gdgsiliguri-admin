import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { ActivityList } from "@/components/dashboard/ActivityList";
import { Button } from "@/components/m3/Button";
import { Card } from "@/components/m3/Card";
import { EditorFallback } from "@/components/section/EditorFallback";
import { ActivityFilters } from "@/components/settings/ActivityFilters";
import { loadActors, loadAudit } from "@/lib/content/queries";
import { isSectionKey } from "@/lib/content/sections";

export const metadata: Metadata = { title: "Activity log" };

const PAGE_SIZE = 25;

type SearchParams = Record<string, string | string[] | undefined>;

function single(value: string | string[] | undefined): string | null {
  return typeof value === "string" && value ? value : null;
}

function href(params: { section: string | null; actor: string | null; after?: string | null }) {
  const query = new URLSearchParams();
  if (params.section) query.set("section", params.section);
  if (params.actor) query.set("actor", params.actor);
  if (params.after) query.set("after", params.after);
  const text = query.toString();
  return text ? `/settings/activity?${text}` : "/settings/activity";
}

async function Log({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const rawSection = single(params.section);
  const section = isSectionKey(rawSection) ? rawSection : null;
  const actor = single(params.actor);
  const after = single(params.after);
  const [{ entries, next }, actors] = await Promise.all([
    loadAudit({ limit: PAGE_SIZE, sectionKey: section ?? undefined, actorEmail: actor ?? undefined, after: after ?? undefined }),
    loadActors(),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <ActivityFilters section={section} actor={actor} actors={actors} />
      <Card variant="outlined" className="overflow-hidden">
        <ActivityList entries={entries} />
      </Card>
      <div className="flex flex-wrap gap-2">
        {after && (
          <Button variant="outlined" icon="vertical_align_top" asChild>
            <Link href={href({ section, actor })}>Newest</Link>
          </Button>
        )}
        {next && (
          <Button variant="tonal" trailingIcon="arrow_downward" asChild>
            <Link href={href({ section, actor, after: next })}>Older</Link>
          </Button>
        )}
      </div>
    </div>
  );
}

export default function Page({ searchParams }: { searchParams: Promise<SearchParams> }) {
  return (
    <div className="flex flex-col gap-4 pt-2">
      <h1 className="text-headline-medium text-on-surface">Activity log</h1>
      <Suspense fallback={<EditorFallback />}>
        <Log searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
