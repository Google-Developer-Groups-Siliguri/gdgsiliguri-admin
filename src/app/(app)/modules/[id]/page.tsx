import type { Metadata } from "next";
import { Suspense } from "react";

import { UploadProvider } from "@/components/editor/upload";
import { ModuleItemsEditor } from "@/components/editors/ModuleItemsEditor";
import { EditorFallback } from "@/components/section/EditorFallback";
import { orNotFound } from "@/lib/cms/load";
import { loadSection } from "@/lib/cms/queries";
import type { SectionState } from "@/lib/cms/repository";
import type { ModuleItem } from "@/lib/schema/v2";

export const metadata: Metadata = { title: "Module" };

const NOUNS: Record<string, string> = { cards: "card", gallery: "image", links: "link" };

async function Editor({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { state } = await orNotFound(loadSection(`module-${id}`));
  const modules = await orNotFound(loadSection("modules"));
  const found = ((modules.state.published.items ?? []) as { id: string; type: string }[]).find(
    (entry) => entry.id === id,
  );
  return (
    <UploadProvider kind="module">
      <ModuleItemsEditor
        state={state as SectionState<{ items: ModuleItem[] }>}
        noun={NOUNS[found?.type ?? ""] ?? "item"}
      />
    </UploadProvider>
  );
}

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<EditorFallback />}>
      <Editor params={params} />
    </Suspense>
  );
}
