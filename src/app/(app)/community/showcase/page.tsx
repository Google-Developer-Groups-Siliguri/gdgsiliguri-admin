import type { Metadata } from "next";
import { Suspense } from "react";

import { PageTitle } from "@/components/PageTitle";
import { EditorFallback } from "@/components/section/EditorFallback";
import { ShowcaseQueue } from "@/components/showcase/ShowcaseQueue";
import { requireAdminPage } from "@/lib/auth/session";
import { db } from "@/lib/cms/repository";
import { listSubmissions, type SubmissionStatus } from "@/lib/cms/showcase";

export const metadata: Metadata = { title: "Showcase" };

const STATUSES: SubmissionStatus[] = ["pending", "approved", "rejected", "hidden"];

async function Queue({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireAdminPage();
  const requested = (await searchParams).status;
  const status = STATUSES.find((value) => value === requested) ?? "pending";
  const [submissions, published] = await Promise.all([listSubmissions(status), db().collection("showcase").get()]);
  const featured = Object.fromEntries(published.docs.map((doc) => [doc.id, Boolean(doc.get("featured"))]));
  return <ShowcaseQueue status={status} submissions={submissions} featured={featured} />;
}

export default function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return (
    <div className="flex flex-col gap-4 pt-2">
      <PageTitle title="Project showcase" eyebrow="Community" />
      <Suspense fallback={<EditorFallback />}>
        <Queue searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
