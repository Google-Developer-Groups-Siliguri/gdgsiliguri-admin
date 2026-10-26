import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { PageTitle } from "@/components/PageTitle";
import { Reveal } from "@/components/Reveal";
import { ActivityList } from "@/components/dashboard/ActivityList";
import { EventCountdown } from "@/components/dashboard/EventCountdown";
import { LiveDataCard } from "@/components/dashboard/LiveDataCard";
import { SectionCard } from "@/components/dashboard/SectionCard";
import { Button } from "@/components/m3/Button";
import { LinearProgress } from "@/components/m3/Progress";
import { getCurrentAdmin } from "@/lib/auth/session";
import { loadAudit, loadLiveStatus, loadRegistry, loadSectionStates, type Visibility } from "@/lib/cms/queries";
import type { SectionState } from "@/lib/cms/repository";
import { sectionWarnings } from "@/lib/cms/warnings";
import type { Edition, Session, Speaker } from "@/lib/schema/v2";
import { communitySections, editionSections, visibilitySectionId, type SectionDef } from "@/lib/sections/registry";
import { toMillis } from "@/lib/time/tz";

export const metadata: Metadata = { title: "Dashboard" };

function Skeleton({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-lg bg-surface-container-high ${className}`} aria-hidden />;
}

async function Greeting() {
  const user = await getCurrentAdmin();
  const name = user?.displayName?.split(" ")[0];
  return (
    <p className="max-w-xl text-body-large text-on-surface-variant">
      {name ? (
        <>
          Hi <b className="font-extrabold text-on-surface">{name}</b>.{" "}
        </>
      ) : (
        ""
      )}
      Here is what gdgsiliguri.com and the app show right now.
    </p>
  );
}

async function EventSummary() {
  const { activeEdition } = await loadRegistry();
  const states = await loadSectionStates([`edition-${activeEdition}`]);
  const edition = states[`edition-${activeEdition}`]?.published as Edition | undefined;
  if (!edition?.startAt) return null;
  return (
    <EventCountdown
      eventAt={toMillis(edition.startAt)}
      registrationClosesAt={edition.registration?.closesAt ? toMillis(edition.registration.closesAt) : null}
      venue={edition.venue?.name ?? ""}
      ticketUrl={edition.registration?.url ?? ""}
      editHref={`/devfest/${activeEdition}/event`}
    />
  );
}

async function LiveData() {
  return <LiveDataCard status={await loadLiveStatus()} />;
}

function visibilityOf(def: SectionDef, states: Record<string, SectionState>): Visibility {
  const ownerId = visibilitySectionId(def);
  if (!ownerId || !def.visibilityKey) return null;
  const sections = (states[ownerId]?.published.sections ?? {}) as Record<string, boolean>;
  return { ownerId, enabled: Boolean(sections[def.visibilityKey.key]) };
}

async function SectionGrid() {
  const registry = await loadRegistry();
  const defs = [...editionSections(registry.activeEdition, registry), ...communitySections()];
  const states = await loadSectionStates([...defs.map((def) => def.id), "site-config"]);
  const base = `edition-${registry.activeEdition}`;
  const context = {
    edition: states[base]?.draft as Edition | undefined,
    speakers: (states[`${base}-speakers`]?.draft.items ?? []) as Speaker[],
    sessions: (states[`${base}-sessions`]?.draft.items ?? []) as Session[],
  };
  return (
    <div className="grid grid-cols-1 gap-3 compact:grid-cols-2 expanded:grid-cols-3">
      {defs.map((def, index) => {
        const state = states[def.id];
        return (
          <Reveal key={def.id} index={index}>
            <SectionCard
              def={{ id: def.id, label: def.label, href: def.href, icon: def.icon }}
              state={state}
              visibility={visibilityOf(def, states)}
              index={index}
              warningCount={state ? sectionWarnings(def.id, state.draft, context).length : 0}
            />
          </Reveal>
        );
      })}
    </div>
  );
}

async function RecentActivity() {
  const { entries } = await loadAudit({ limit: 10 });
  return <ActivityList entries={entries} />;
}

export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-10 pt-2">
      <PageTitle title="Dashboard" eyebrow="Overview" className="animate-rise">
        <Suspense fallback={<Skeleton className="h-6 w-72" />}>
          <Greeting />
        </Suspense>
      </PageTitle>

      <div className="grid grid-cols-1 gap-3 expanded:grid-cols-3">
        <Reveal index={1} className="expanded:col-span-2">
          <Suspense fallback={<Skeleton className="h-80" />}>
            <EventSummary />
          </Suspense>
        </Reveal>
        <Reveal index={2}>
          <Suspense fallback={<Skeleton className="h-80" />}>
            <LiveData />
          </Suspense>
        </Reveal>
      </div>

      <section className="flex flex-col gap-4" aria-labelledby="sections-heading">
        <h2
          id="sections-heading"
          className="font-display text-[clamp(28px,3vw,40px)] leading-none font-extralight tracking-[-0.04em] text-on-surface"
        >
          <b className="font-extrabold">Sections</b>
        </h2>
        <Suspense fallback={<LinearProgress label="Loading sections" />}>
          <SectionGrid />
        </Suspense>
      </section>

      <section className="flex flex-col gap-3" aria-labelledby="activity-heading">
        <div className="flex items-center justify-between">
          <h2
            id="activity-heading"
            className="font-display text-[clamp(28px,3vw,40px)] leading-none font-extralight tracking-[-0.04em] text-on-surface"
          >
            Recent <b className="font-extrabold">activity</b>
          </h2>
          <Button variant="text" asChild>
            <Link href="/settings/activity">See all</Link>
          </Button>
        </div>
        <Suspense fallback={<LinearProgress label="Loading activity" />}>
          <RecentActivity />
        </Suspense>
      </section>
    </div>
  );
}
