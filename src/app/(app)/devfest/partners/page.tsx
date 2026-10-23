import type { Metadata } from "next";
import { Suspense } from "react";

import { UploadProvider } from "@/components/editor/upload";
import { PartnersEditor } from "@/components/editors/PartnersEditor";
import { EditorFallback } from "@/components/section/EditorFallback";
import { loadSection } from "@/lib/content/queries";

export const metadata: Metadata = { title: "Community partners" };

async function Editor() {
  return (
    <UploadProvider kind="partner">
      <PartnersEditor state={await loadSection("communityPartners")} />
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
