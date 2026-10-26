import type { Metadata } from "next";
import { Suspense } from "react";

import { UploadProvider } from "@/components/editor/upload";
import { TeamEditor } from "@/components/editors/TeamEditor";
import { EditorFallback } from "@/components/section/EditorFallback";
import { orNotFound } from "@/lib/cms/load";
import { loadSection } from "@/lib/cms/queries";
import type { SectionState } from "@/lib/cms/repository";
import type { TeamMember } from "@/lib/schema/v2";

export const metadata: Metadata = { title: "Team" };

async function Editor() {
  const { state, visibility } = await orNotFound(loadSection("team"));
  return (
    <UploadProvider kind="team">
      <TeamEditor state={state as SectionState<{ items: TeamMember[] }>} visibility={visibility} />
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
