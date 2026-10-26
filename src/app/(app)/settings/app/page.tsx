import type { Metadata } from "next";
import { Suspense } from "react";

import { AppSettingsEditor } from "@/components/editors/AppSettingsEditor";
import { EditorFallback } from "@/components/section/EditorFallback";
import { orNotFound } from "@/lib/cms/load";
import { loadRegistry, loadSection } from "@/lib/cms/queries";
import type { SectionState } from "@/lib/cms/repository";
import type { SiteApp } from "@/lib/schema/v2";

export const metadata: Metadata = { title: "App settings" };

async function Editor() {
  const { state } = await orNotFound(loadSection("site-app"));
  const { modules } = await loadRegistry();
  return (
    <AppSettingsEditor
      state={state as SectionState<SiteApp>}
      modules={modules.map((module) => ({ id: module.id, title: module.title }))}
    />
  );
}

export default function Page() {
  return (
    <Suspense fallback={<EditorFallback />}>
      <Editor />
    </Suspense>
  );
}
