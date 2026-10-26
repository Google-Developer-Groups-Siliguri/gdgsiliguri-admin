import type { Metadata } from "next";
import { Suspense } from "react";

import { SiteEditor } from "@/components/editors/SiteEditor";
import { EditorFallback } from "@/components/section/EditorFallback";
import { orNotFound } from "@/lib/cms/load";
import { loadRegistry, loadSection, loadSectionStates } from "@/lib/cms/queries";
import type { SectionState } from "@/lib/cms/repository";
import type { Edition, SiteConfig } from "@/lib/schema/v2";

export const metadata: Metadata = { title: "Site" };

async function Editor() {
  const [{ state }, registry] = await Promise.all([orNotFound(loadSection("site-config")), loadRegistry()]);
  const years = [...new Set([...registry.editionYears, registry.activeEdition])].sort((a, b) => b - a);
  const states = await loadSectionStates(years.map((year) => `edition-${year}`));
  const editions = years.flatMap((year) => {
    const edition = states[`edition-${year}`]?.published as Edition | undefined;
    return edition?.startAt ? [{ year, title: edition.title, startAt: edition.startAt, endAt: edition.endAt }] : [];
  });
  return <SiteEditor state={state as SectionState<SiteConfig>} editions={editions} />;
}

export default function Page() {
  return (
    <Suspense fallback={<EditorFallback />}>
      <Editor />
    </Suspense>
  );
}
