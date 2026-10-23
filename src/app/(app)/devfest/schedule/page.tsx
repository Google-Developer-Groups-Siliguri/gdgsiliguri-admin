import type { Metadata } from "next";
import { Suspense } from "react";

import { UploadProvider } from "@/components/editor/upload";
import { ScheduleEditor } from "@/components/editors/ScheduleEditor";
import { EditorFallback } from "@/components/section/EditorFallback";
import { loadSection } from "@/lib/content/queries";

export const metadata: Metadata = { title: "Schedule" };

async function Editor() {
  const [schedule, speakers] = await Promise.all([loadSection("schedule"), loadSection("speakers")]);
  return (
    <UploadProvider kind="speaker">
      <ScheduleEditor state={schedule} speakers={speakers.draft.data} />
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
