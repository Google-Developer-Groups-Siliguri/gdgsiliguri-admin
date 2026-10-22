import type { Metadata } from "next";
import { Suspense } from "react";

import { PartnersEditor } from "@/components/editors/PartnersEditor";
import { EditorFallback } from "@/components/section/EditorFallback";
import { loadSection } from "@/lib/content/queries";

export const metadata: Metadata = { title: "Community partners" };

async function Editor() {
  return <PartnersEditor state={await loadSection("communityPartners")} />;
}

export default function Page() {
  return (
    <Suspense fallback={<EditorFallback />}>
      <Editor />
    </Suspense>
  );
}
