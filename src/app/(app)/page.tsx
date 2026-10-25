import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { PageTitle } from "@/components/PageTitle";
import { RelativeTime } from "@/components/RelativeTime";
import { ActivityList } from "@/components/dashboard/ActivityList";
import { EventCountdown } from "@/components/dashboard/EventCountdown";
import { SectionCard } from "@/components/dashboard/SectionCard";
import { Button } from "@/components/m3/Button";
import { Card } from "@/components/m3/Card";
import { Icon } from "@/components/m3/Icon";
import { LinearProgress } from "@/components/m3/Progress";
import { getCurrentAdmin } from "@/lib/auth/session";
import { loadAllSections, loadAudit, loadPendingRebuild, loadSection, loadSiteSettings } from "@/lib/content/queries";
import { SECTIONS } from "@/lib/content/sections";
import { SECTION_KEYS } from "@/lib/content/sections";
import { dateTimeToEpoch } from "@/lib/datetime";
import { formatDateTime } from "@/lib/time";

export const metadata: Metadata = { title: "Dashboard" };

function Skeleton({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-lg bg-surface-container-high ${className}`} aria-hidden />;
}

async function Greeting() {
  const user = await getCurrentAdmin();
  const name = user?.displayName?.split(" ")[0];
  return (
    <p className="max-w-xl text-body-large text-on-surface-variant">
      {name ? <>Hi <b className="font-extrabold text-on-surface">{name}</b>. </> : ""}Here is what
      gdgsiliguri.com shows right now.
    </p>
  );
}

async function EventSummary() {
  const details = await loadSection("eventDetails").catch(() => null);
  if (!details) return null;
  const published = details.published;
  return (
    <EventCountdown
      eventAt={dateTimeToEpoch(published.eventDateTime)}
      registrationClosesAt={dateTimeToEpoch(published.registrationExpiryDateTime)}
      venue={published.eventVenue.name}
      ticketUrl={published.eventTicketURL}
    />
  );
}

async function RebuildSummary() {
  const [settings, pending] = await Promise.all([loadSiteSettings(), loadPendingRebuild()]);
  const waiting = pending.sections.map((key) => SECTIONS[key].label);
  return (
    <Card
      variant="tinted"
      className="lift flex h-full flex-col gap-4 rounded-[36px_36px_36px_10px] bg-surface-container p-6 text-on-surface hover:rounded-[36px]"
    >
      <span className="shape-clover4 grid size-14 place-items-center bg-tertiary-container text-on-tertiary-container">
        <Icon name="rocket_launch" />
      </span>
      <h2 className="font-display text-[28px] leading-none font-light tracking-[-0.03em]">
        Rebuild <b className="font-extrabold">website</b>
      </h2>
      <p className="flex-1 text-body-medium text-on-surface-variant">
        {waiting.length
          ? `Waiting for a rebuild: ${waiting.join(", ")}.`
          : "The live site has everything that was published."}
      </p>
      <p className="text-body-small text-on-surface-variant" title={formatDateTime(settings.lastRebuildAt)}>
        Last rebuild: <RelativeTime iso={settings.lastRebuildAt} />
        {settings.lastRebuildBy ? ` by ${settings.lastRebuildBy}` : ""}
      </p>
      <div>
        <Button variant="tonal" icon="rocket_launch" asChild>
          <Link href="/settings/rebuild">Open rebuild</Link>
        </Button>
      </div>
    </Card>
  );
}

async function SectionGrid() {
  const states = await loadAllSections();
  return (
    <div className="grid grid-cols-1 gap-3 compact:grid-cols-2 expanded:grid-cols-3">
      {SECTION_KEYS.map((key, index) => (
        <SectionCard key={key} sectionKey={key} state={states[key]} index={index} />
      ))}
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

      <div className="grid grid-cols-1 gap-3 animate-rise [animation-delay:80ms] expanded:grid-cols-3">
        <div className="expanded:col-span-2">
          <Suspense fallback={<Skeleton className="h-80" />}>
            <EventSummary />
          </Suspense>
        </div>
        <Suspense fallback={<Skeleton className="h-80" />}>
          <RebuildSummary />
        </Suspense>
      </div>

      <section className="flex flex-col gap-4 animate-rise [animation-delay:160ms]" aria-labelledby="sections-heading">
        <h2 id="sections-heading" className="font-display text-[clamp(28px,3vw,40px)] leading-none font-extralight tracking-[-0.04em] text-on-surface">
          <b className="font-extrabold">Sections</b>
        </h2>
        <Suspense fallback={<LinearProgress label={`Loading ${SECTION_KEYS.length} sections`} />}>
          <SectionGrid />
        </Suspense>
      </section>

      <section className="flex flex-col gap-3" aria-labelledby="activity-heading">
        <div className="flex items-center justify-between">
          <h2 id="activity-heading" className="font-display text-[clamp(28px,3vw,40px)] leading-none font-extralight tracking-[-0.04em] text-on-surface">
            Recent <b className="font-extrabold">activity</b>
          </h2>
          <Button variant="text" asChild>
            <Link href="/settings/activity">See all</Link>
          </Button>
        </div>
        <Card variant="outlined" className="overflow-hidden rounded-[32px] bg-surface-container">
          <Suspense fallback={<LinearProgress label="Loading activity" />}>
            <RecentActivity />
          </Suspense>
        </Card>
      </section>
    </div>
  );
}
