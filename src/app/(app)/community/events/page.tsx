import type { Metadata } from "next";
import { Suspense } from "react";

import { EventsEditor } from "@/components/editors/EventsEditor";
import { EditorFallback } from "@/components/section/EditorFallback";
import { loadSection } from "@/lib/content/queries";

export const metadata: Metadata = { title: "Events" };

async function Editor() {
  return <EventsEditor state={await loadSection("events")} />;
}

export default function Page() {
  return (
    <Suspense fallback={<EditorFallback />}>
      <Editor />
    </Suspense>
  );
}
