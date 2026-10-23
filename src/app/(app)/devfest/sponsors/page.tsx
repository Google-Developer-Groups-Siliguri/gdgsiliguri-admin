import type { Metadata } from "next";
import { Suspense } from "react";

import { UploadProvider } from "@/components/editor/upload";
import { SponsorsEditor } from "@/components/editors/SponsorsEditor";
import { EditorFallback } from "@/components/section/EditorFallback";
import { loadSection } from "@/lib/content/queries";

export const metadata: Metadata = { title: "Sponsors" };

async function Editor() {
  return (
    <UploadProvider kind="sponsor">
      <SponsorsEditor state={await loadSection("sponsors")} />
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
