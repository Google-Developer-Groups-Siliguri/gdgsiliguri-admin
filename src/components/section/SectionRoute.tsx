import { Suspense } from "react";

import { LinearProgress } from "@/components/m3/Progress";
import { loadSection } from "@/lib/content/queries";
import type { SectionKey } from "@/lib/content/sections";

import { ReadOnlySection } from "./ReadOnlySection";

async function LoadedSection({ sectionKey }: { sectionKey: SectionKey }) {
  const state = await loadSection(sectionKey);
  return <ReadOnlySection state={state} />;
}

export function SectionRoute({ sectionKey }: { sectionKey: SectionKey }) {
  return (
    <Suspense fallback={<LinearProgress className="mt-4" label="Loading section" />}>
      <LoadedSection sectionKey={sectionKey} />
    </Suspense>
  );
}
