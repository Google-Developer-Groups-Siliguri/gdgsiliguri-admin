import type { Metadata } from "next";
import { Suspense } from "react";

import { UploadProvider } from "@/components/editor/upload";
import { TeamEditor } from "@/components/editors/TeamEditor";
import { EditorFallback } from "@/components/section/EditorFallback";
import { loadSection } from "@/lib/content/queries";

export const metadata: Metadata = { title: "Team" };

async function Editor() {
  return (
    <UploadProvider kind="team">
      <TeamEditor state={await loadSection("teams")} />
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
