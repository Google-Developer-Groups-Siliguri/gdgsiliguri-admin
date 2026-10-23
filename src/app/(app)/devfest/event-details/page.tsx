import type { Metadata } from "next";
import { Suspense } from "react";

import { UploadProvider } from "@/components/editor/upload";
import { EventDetailsEditor } from "@/components/editors/EventDetailsEditor";
import { EditorFallback } from "@/components/section/EditorFallback";
import { loadSection } from "@/lib/content/queries";

export const metadata: Metadata = { title: "Event details" };

async function Editor() {
  return (
    <UploadProvider kind="branding">
      <EventDetailsEditor state={await loadSection("eventDetails")} />
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
