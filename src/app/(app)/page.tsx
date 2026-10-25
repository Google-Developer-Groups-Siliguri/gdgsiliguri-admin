import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { PageTitle } from "@/components/PageTitle";
import { Reveal } from "@/components/Reveal";
import { ActivityList } from "@/components/dashboard/ActivityList";
import { EventCountdown } from "@/components/dashboard/EventCountdown";
import { SectionCard } from "@/components/dashboard/SectionCard";
import { Button } from "@/components/m3/Button";
import { Card } from "@/components/m3/Card";
import { Icon } from "@/components/m3/Icon";
import { LinearProgress } from "@/components/m3/Progress";
import { getCurrentAdmin } from "@/lib/auth/session";
import { loadAllSections, loadAudit, loadSection } from "@/lib/content/queries";
import { SECTION_KEYS } from "@/lib/content/sections";
import { dateTimeToEpoch } from "@/lib/datetime";

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

function LiveSiteCard() {
  return (
    <Card
      variant="tinted"
      className="lift flex h-full flex-col gap-4 rounded-[36px_36px_36px_10px] bg-surface-container p-6 text-on-surface hover:rounded-[36px]"
    >
      <span className="shape-clover4 grid size-14 place-items-center bg-tertiary-container text-on-tertiary-container">
        <Icon name="public" />
      </span>
      <h2 className="font-display text-[28px] leading-none font-light tracking-[-0.03em]">
        Live <b className="font-extrabold">site</b>
      </h2>
      <p className="flex-1 text-body-medium text-on-surface-variant">
        Publishing updates gdgsiliguri.com straight away. Visitors see the change the next time a page
        loads.
      </p>
      <div>
        <Button variant="tonal" trailingIcon="open_in_new" asChild>
          <a href="https://gdgsiliguri.com" target="_blank" rel="noreferrer">
            Open gdgsiliguri.com
          </a>
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
        <Reveal key={key} index={index}>
          <SectionCard sectionKey={key} state={states[key]} index={index} />
        </Reveal>
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

      <div className="grid grid-cols-1 gap-3 expanded:grid-cols-3">
        <Reveal index={1} className="expanded:col-span-2">
          <Suspense fallback={<Skeleton className="h-80" />}>
            <EventSummary />
          </Suspense>
        </Reveal>
        <Reveal index={2}>
          <LiveSiteCard />
        </Reveal>
      </div>

      <section className="flex flex-col gap-4" aria-labelledby="sections-heading">
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
        <Suspense fallback={<LinearProgress label="Loading activity" />}>
          <RecentActivity />
        </Suspense>
      </section>
    </div>
  );
}
