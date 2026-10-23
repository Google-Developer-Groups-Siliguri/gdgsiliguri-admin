import type { Metadata } from "next";
import { Suspense } from "react";

import { UploadProvider } from "@/components/editor/upload";
import { SpeakersEditor } from "@/components/editors/SpeakersEditor";
import { EditorFallback } from "@/components/section/EditorFallback";
import { loadSection } from "@/lib/content/queries";

export const metadata: Metadata = { title: "Speakers" };

async function Editor() {
  const [speakers, details] = await Promise.all([loadSection("speakers"), loadSection("eventDetails")]);
  return (
    <UploadProvider kind="speaker">
      <SpeakersEditor state={speakers} frames={details.draft.frames.speakers} />
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
