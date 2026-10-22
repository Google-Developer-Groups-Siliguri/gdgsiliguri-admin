import type { Metadata } from "next";
import { Suspense } from "react";

import { FaqEditor } from "@/components/editors/FaqEditor";
import { EditorFallback } from "@/components/section/EditorFallback";
import { loadSection } from "@/lib/content/queries";

export const metadata: Metadata = { title: "DevFest FAQ" };

async function Editor() {
  return <FaqEditor state={await loadSection("devfestFaqs")} />;
}

export default function Page() {
  return (
    <Suspense fallback={<EditorFallback />}>
      <Editor />
    </Suspense>
  );
}
