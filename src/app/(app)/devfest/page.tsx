import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { PageTitle } from "@/components/PageTitle";
import { RelativeTime } from "@/components/RelativeTime";
import { NewEditionDialog } from "@/components/editions/NewEditionDialog";
import { Card } from "@/components/m3/Card";
import { Icon } from "@/components/m3/Icon";
import { LinearProgress } from "@/components/m3/Progress";
import { loadRegistry, loadSectionStates } from "@/lib/cms/queries";
import type { Edition } from "@/lib/schema/v2";
import { formatEventMoment } from "@/lib/time";
import { toMillis } from "@/lib/time/tz";

export const metadata: Metadata = { title: "DevFest editions" };

async function Editions() {
  const registry = await loadRegistry();
  const years = [...new Set([...registry.editionYears, registry.activeEdition])].sort((a, b) => b - a);
  const states = await loadSectionStates(years.map((year) => `edition-${year}`));
  return (
    <div className="flex flex-col gap-4">
      <div>
        <NewEditionDialog years={years.filter((year) => states[`edition-${year}`]?.publishedAt)} />
      </div>
      <div className="grid grid-cols-1 gap-3 compact:grid-cols-2 expanded:grid-cols-3">
        {years.map((year) => {
          const state = states[`edition-${year}`];
          const edition = (state?.publishedAt ? state.published : state?.draft) as Edition | undefined;
          const active = year === registry.activeEdition;
          return (
            <Card
              key={year}
              variant="tinted"
              className="lift relative flex flex-col gap-3 rounded-[28px] bg-surface-container p-5"
            >
              <div className="flex items-center gap-2">
                <Icon name="festival" className="text-primary" />
                <Link
                  href={`/devfest/${year}/event`}
                  className="focus-ring rounded-xs font-display text-[20px] font-bold text-on-surface after:absolute after:inset-0"
                >
                  {edition?.title || `DevFest ${year}`}
                </Link>
                {active && (
                  <span className="ms-auto rounded-full bg-primary px-2.5 py-0.5 text-label-medium text-on-primary">
                    Active
                  </span>
                )}
              </div>
              <span className="text-body-medium text-on-surface-variant">
                {edition?.startAt ? formatEventMoment(toMillis(edition.startAt)) : "No date yet"}
                {edition?.venue?.name ? ` · ${edition.venue.name}` : ""}
              </span>
              <span className="text-body-small text-on-surface-variant">
                {state?.publishedAt ? (
                  <>
                    Published <RelativeTime iso={state.publishedAt} />
                  </>
                ) : (
                  "Draft only, not public yet"
                )}
              </span>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

export default function Page() {
  return (
    <div className="flex flex-col gap-6 pt-2">
      <PageTitle title="DevFest editions" eyebrow="DevFest" />
      <Suspense fallback={<LinearProgress label="Loading editions" />}>
        <Editions />
      </Suspense>
    </div>
  );
}
