import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { ActivityList } from "@/components/dashboard/ActivityList";
import { EventCountdown } from "@/components/dashboard/EventCountdown";
import { SectionCard } from "@/components/dashboard/SectionCard";
import { Button } from "@/components/m3/Button";
import { Card } from "@/components/m3/Card";
import { Icon } from "@/components/m3/Icon";
import { LinearProgress } from "@/components/m3/Progress";
import { getCurrentAdmin } from "@/lib/auth/session";
import { loadAllSections, loadAudit, loadSection, loadSiteSettings } from "@/lib/content/queries";
import { SECTION_KEYS } from "@/lib/content/sections";
import { dateTimeToEpoch } from "@/lib/datetime";
import { formatDateTime, timeAgo } from "@/lib/time";

export const metadata: Metadata = { title: "Dashboard" };

function Skeleton({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-md bg-surface-container-high ${className}`} aria-hidden />;
}

async function Greeting() {
  const user = await getCurrentAdmin();
  const name = user?.displayName?.split(" ")[0];
  return (
    <p className="text-body-large text-on-surface-variant">
      {name ? `Hi ${name}. ` : ""}Here is what gdgsiliguri.com shows right now.
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
  const settings = await loadSiteSettings();
  return (
    <Card variant="filled" className="flex flex-col gap-3 p-5">
      <div className="flex items-center gap-3">
        <Icon name="rocket_launch" className="text-tertiary" />
        <span className="text-title-medium">Rebuild website</span>
      </div>
      <p className="flex-1 text-body-medium text-on-surface-variant">
        {settings.rebuildConfigured
          ? "Published changes appear on gdgsiliguri.com after the site is rebuilt."
          : "The Netlify build hook is not configured yet, so rebuilds have to be started in Netlify."}
      </p>
      <p className="text-body-small text-on-surface-variant" title={formatDateTime(settings.lastRebuildAt)}>
        Last rebuild: {timeAgo(settings.lastRebuildAt)}
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
      {SECTION_KEYS.map((key) => (
        <SectionCard key={key} sectionKey={key} state={states[key]} />
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
    <div className="flex flex-col gap-8 pt-2">
      <div className="flex flex-col gap-1">
        <h1 className="text-headline-medium text-on-surface">Dashboard</h1>
        <Suspense fallback={<Skeleton className="h-6 w-72" />}>
          <Greeting />
        </Suspense>
      </div>

      <div className="grid grid-cols-1 gap-3 expanded:grid-cols-3">
        <div className="expanded:col-span-2">
          <Suspense fallback={<Skeleton className="h-56" />}>
            <EventSummary />
          </Suspense>
        </div>
        <Suspense fallback={<Skeleton className="h-56" />}>
          <RebuildSummary />
        </Suspense>
      </div>

      <section className="flex flex-col gap-3" aria-labelledby="sections-heading">
        <h2 id="sections-heading" className="text-title-large text-on-surface">
          Sections
        </h2>
        <Suspense fallback={<LinearProgress label={`Loading ${SECTION_KEYS.length} sections`} />}>
          <SectionGrid />
        </Suspense>
      </section>

      <section className="flex flex-col gap-3" aria-labelledby="activity-heading">
        <div className="flex items-center justify-between">
          <h2 id="activity-heading" className="text-title-large text-on-surface">
            Recent activity
          </h2>
          <Button variant="text" asChild>
            <Link href="/settings/activity">See all</Link>
          </Button>
        </div>
        <Card variant="outlined" className="overflow-hidden">
          <Suspense fallback={<LinearProgress label="Loading activity" />}>
            <RecentActivity />
          </Suspense>
        </Card>
      </section>
    </div>
  );
}
