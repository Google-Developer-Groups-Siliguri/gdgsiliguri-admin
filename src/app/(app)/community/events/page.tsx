import type { Metadata } from "next";
import { Suspense } from "react";

import { UploadProvider } from "@/components/editor/upload";
import { EventsEditor } from "@/components/editors/EventsEditor";
import { EditorFallback } from "@/components/section/EditorFallback";
import { orNotFound } from "@/lib/cms/load";
import { loadSection } from "@/lib/cms/queries";
import type { SectionState } from "@/lib/cms/repository";
import type { CommunityEvent } from "@/lib/schema/v2";

export const metadata: Metadata = { title: "Events" };

async function Editor() {
  const { state, visibility } = await orNotFound(loadSection("events"));
  return (
    <UploadProvider kind="event">
      <EventsEditor state={state as SectionState<{ items: CommunityEvent[] }>} visibility={visibility} />
    </UploadProvider>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<EditorFallback />}>
      <Editor />
    </Suspense>
  );
}
