import type { Metadata } from "next";
import { Suspense } from "react";

import { ModulesEditor } from "@/components/editors/ModulesEditor";
import { EditorFallback } from "@/components/section/EditorFallback";
import { orNotFound } from "@/lib/cms/load";
import { loadSection, loadSectionStates } from "@/lib/cms/queries";
import type { SectionState } from "@/lib/cms/repository";
import type { ModuleDoc, SiteApp } from "@/lib/schema/v2";

export const metadata: Metadata = { title: "Modules" };

async function Editor() {
  const { state } = await orNotFound(loadSection("modules"));
  const app = (await loadSectionStates(["site-app"]))["site-app"]?.published as SiteApp | undefined;
  return <ModulesEditor state={state as SectionState<{ items: ModuleDoc[] }>} latestBuild={app?.latestBuild ?? 0} />;
}

export default function Page() {
  return (
    <Suspense fallback={<EditorFallback />}>
      <Editor />
    </Suspense>
  );
}
