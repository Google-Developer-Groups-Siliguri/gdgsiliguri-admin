import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { UploadProvider } from "@/components/editor/upload";
import { EditionEditor } from "@/components/editors/EditionEditor";
import { FaqEditor } from "@/components/editors/FaqEditor";
import { PartnersEditor } from "@/components/editors/PartnersEditor";
import { ScheduleEditor } from "@/components/editors/ScheduleEditor";
import { SpeakersEditor } from "@/components/editors/SpeakersEditor";
import { SponsorsEditor } from "@/components/editors/SponsorsEditor";
import { EditorFallback } from "@/components/section/EditorFallback";
import { mergeItems, orNotFound } from "@/lib/cms/load";
import { loadSection } from "@/lib/cms/queries";
import type { SectionState } from "@/lib/cms/repository";
import type { Edition, Faq, Partner, Session, Speaker, Sponsor } from "@/lib/schema/v2";

type Params = { year: string; section: string };

const PAGES: Record<string, { collection?: string; title: string }> = {
  event: { title: "Event" },
  schedule: { collection: "sessions", title: "Schedule" },
  speakers: { collection: "speakers", title: "Speakers" },
  sponsors: { collection: "sponsors", title: "Sponsors" },
  partners: { collection: "partners", title: "Partners" },
  faq: { collection: "faqs", title: "FAQ" },
};

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { year, section } = await params;
  return { title: `${year} · ${PAGES[section]?.title ?? "DevFest"}` };
}

type Items<T> = SectionState<{ items: T[] }>;

function items<T>(state: SectionState): T[] {
  const draft = (state.draft.items ?? []) as T[];
  const published = (state.published.items ?? []) as T[];
  return mergeItems(draft as never[], published as never[]) as T[];
}

async function Editor({ params }: { params: Promise<Params> }) {
  const { year, section } = await params;
  const page = PAGES[section];
  if (!/^\d{4}$/.test(year) || !page) notFound();
  const base = `edition-${year}`;
  const id = page.collection ? `${base}-${page.collection}` : base;
  const loaded = await orNotFound(loadSection(id));
  const { state, visibility } = loaded;
  const numericYear = Number(year);

  if (section === "event") {
    const [sessions, speakers] = await Promise.all([loadSection(`${base}-sessions`), loadSection(`${base}-speakers`)]);
    const usedTrackIds: Record<string, number> = {};
    for (const item of [...items<Session>(sessions.state), ...items<Speaker>(speakers.state)]) {
      if (item.trackId) usedTrackIds[item.trackId] = (usedTrackIds[item.trackId] ?? 0) + 1;
    }
    return (
      <UploadProvider kind="branding" year={numericYear}>
        <EditionEditor state={state as SectionState<Edition>} usedTrackIds={usedTrackIds} />
      </UploadProvider>
    );
  }

  if (section === "schedule" || section === "speakers") {
    const [edition, other] = await Promise.all([
      loadSection(base),
      loadSection(section === "schedule" ? `${base}-speakers` : `${base}-sessions`),
    ]);
    const doc = edition.state.draft as Edition;
    return (
      <UploadProvider kind="speaker" year={numericYear}>
        {section === "schedule" ? (
          <ScheduleEditor
            state={state as Items<Session>}
            visibility={visibility}
            edition={doc}
            speakers={items<Speaker>(other.state)}
          />
        ) : (
          <SpeakersEditor
            state={state as Items<Speaker>}
            visibility={visibility}
            edition={doc}
            sessions={(other.state.draft.items ?? []) as Session[]}
          />
        )}
      </UploadProvider>
    );
  }

  if (section === "sponsors") {
    return (
      <UploadProvider kind="sponsor" year={numericYear}>
        <SponsorsEditor state={state as Items<Sponsor>} visibility={visibility} />
      </UploadProvider>
    );
  }
  if (section === "partners") {
    return (
      <UploadProvider kind="partner" year={numericYear}>
        <PartnersEditor state={state as Items<Partner>} visibility={visibility} />
      </UploadProvider>
    );
  }
  return <FaqEditor state={state as Items<Faq>} visibility={visibility} />;
}

export default function Page({ params }: { params: Promise<Params> }) {
  return (
    <Suspense fallback={<EditorFallback />}>
      <Editor params={params} />
    </Suspense>
  );
}
