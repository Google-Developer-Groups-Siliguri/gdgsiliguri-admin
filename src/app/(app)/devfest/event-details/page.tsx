import type { Metadata } from "next";
import { Suspense } from "react";

import { EventDetailsEditor } from "@/components/editors/EventDetailsEditor";
import { EditorFallback } from "@/components/section/EditorFallback";
import { loadSection } from "@/lib/content/queries";

export const metadata: Metadata = { title: "Event details" };

async function Editor() {
  return <EventDetailsEditor state={await loadSection("eventDetails")} />;
}

export default function Page() {
  return (
    <Suspense fallback={<EditorFallback />}>
      <Editor />
    </Suspense>
  );
}
