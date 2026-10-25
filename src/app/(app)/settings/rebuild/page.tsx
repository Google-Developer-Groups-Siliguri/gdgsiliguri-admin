import type { Metadata } from "next";
import { Suspense } from "react";

import { PageTitle } from "@/components/PageTitle";
import { EditorFallback } from "@/components/section/EditorFallback";
import { RebuildPanel } from "@/components/settings/RebuildPanel";
import { loadPendingRebuild, loadSiteSettings } from "@/lib/content/queries";

export const metadata: Metadata = { title: "Rebuild website" };

async function Panel() {
  const [settings, pending] = await Promise.all([loadSiteSettings(), loadPendingRebuild()]);
  return (
    <RebuildPanel
      configured={settings.rebuildConfigured}
      pending={pending.sections}
      lastRebuildAt={settings.lastRebuildAt}
      lastRebuildBy={settings.lastRebuildBy}
    />
  );
}

export default function Page() {
  return (
    <div className="flex flex-col gap-4 pt-2">
      <PageTitle title="Rebuild website" eyebrow="Settings" />
      <Suspense fallback={<EditorFallback />}>
        <Panel />
      </Suspense>
    </div>
  );
}
