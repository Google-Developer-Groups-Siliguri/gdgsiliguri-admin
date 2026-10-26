import type { Metadata } from "next";
import { Suspense } from "react";

import { FaqEditor } from "@/components/editors/FaqEditor";
import { EditorFallback } from "@/components/section/EditorFallback";
import { orNotFound } from "@/lib/cms/load";
import { loadSection } from "@/lib/cms/queries";
import type { SectionState } from "@/lib/cms/repository";
import type { Faq } from "@/lib/schema/v2";

export const metadata: Metadata = { title: "Community FAQ" };

async function Editor() {
  const { state, visibility } = await orNotFound(loadSection("faqs"));
  return <FaqEditor state={state as SectionState<{ items: Faq[] }>} visibility={visibility} />;
}

export default function Page() {
  return (
    <Suspense fallback={<EditorFallback />}>
      <Editor />
    </Suspense>
  );
}
