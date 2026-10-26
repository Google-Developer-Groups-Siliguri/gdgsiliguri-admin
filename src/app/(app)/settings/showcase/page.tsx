import type { Metadata } from "next";
import { headers } from "next/headers";
import { Suspense } from "react";

import { PageTitle } from "@/components/PageTitle";
import { EditorFallback } from "@/components/section/EditorFallback";
import { ShowcaseSettings } from "@/components/showcase/ShowcaseSettings";
import { requireAdminPage } from "@/lib/auth/session";
import { readShowcaseSettings } from "@/lib/cms/showcase";

export const metadata: Metadata = { title: "Showcase form" };

async function Settings() {
  await requireAdminPage("owner");
  const { hasSecret, acceptingSubmissions } = await readShowcaseSettings();
  const host = (await headers()).get("host") ?? "admin.gdgsiliguri.com";
  const protocol = host.startsWith("localhost") ? "http" : "https";
  return (
    <ShowcaseSettings
      hasSecret={hasSecret}
      acceptingSubmissions={acceptingSubmissions}
      ingestUrl={`${protocol}://${host}/api/showcase/ingest`}
    />
  );
}

export default function Page() {
  return (
    <div className="flex flex-col gap-4 pt-2">
      <PageTitle title="Showcase form" eyebrow="Settings" />
      <Suspense fallback={<EditorFallback />}>
        <Settings />
      </Suspense>
    </div>
  );
}
