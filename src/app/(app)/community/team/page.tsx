import type { Metadata } from "next";
import { Suspense } from "react";

import { TeamEditor } from "@/components/editors/TeamEditor";
import { EditorFallback } from "@/components/section/EditorFallback";
import { loadSection } from "@/lib/content/queries";

export const metadata: Metadata = { title: "Team" };

async function Editor() {
  return <TeamEditor state={await loadSection("teams")} />;
}

export default function Page() {
  return (
    <Suspense fallback={<EditorFallback />}>
      <Editor />
    </Suspense>
  );
}
