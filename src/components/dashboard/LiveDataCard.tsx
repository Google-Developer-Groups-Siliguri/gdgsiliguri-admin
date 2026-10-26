import { RelativeTime } from "@/components/RelativeTime";
import { Card } from "@/components/m3/Card";
import { Icon } from "@/components/m3/Icon";
import type { LiveStatus } from "@/lib/cms/queries";

import { RetrySyncButton } from "./RetrySyncButton";

function Row({ icon, title, children }: { icon: string; title: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <span className="shape-cookie6 mt-0.5 grid size-9 shrink-0 place-items-center bg-secondary-container text-on-secondary-container">
        <Icon name={icon} size={18} />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-title-small text-on-surface">{title}</span>
        <span className="text-body-small text-on-surface-variant">{children}</span>
      </div>
    </div>
  );
}

export function LiveDataCard({ status }: { status: LiveStatus }) {
  const drift = status.pending.filter((entry) => entry.lastError?.startsWith("drift"));
  return (
    <Card
      variant="tinted"
      className="flex h-full flex-col gap-4 rounded-[36px_36px_36px_10px] bg-surface-container p-6 text-on-surface"
    >
      <h2 className="font-display text-[28px] leading-none font-light tracking-[-0.03em]">
        Live <b className="font-extrabold">data</b>
      </h2>
      <Row icon="publish" title="Last publish">
        {status.lastPublish ? (
          <>
            {status.lastPublish.summary} · <RelativeTime iso={status.lastPublish.at} />
          </>
        ) : (
          "Nothing published yet"
        )}
      </Row>
      <Row icon={status.pending.length ? "sync_problem" : "sync"} title="Older app versions">
        {status.pending.length === 0 ? (
          <>
            Up to date{status.lastSyncedAt ? " · " : ""}
            {status.lastSyncedAt && <RelativeTime iso={status.lastSyncedAt} />}
          </>
        ) : (
          `${status.pending.length} part(s) waiting: ${status.pending.map((entry) => `/${entry.path}`).join(", ")}`
        )}
      </Row>
      {drift.length > 0 && (
        <p className="rounded-lg bg-error-container px-4 py-3 text-body-small text-on-error-container" role="alert">
          Someone edited the Realtime Database directly at {drift.map((entry) => `/${entry.path}`).join(", ")}. The
          admin kept its own version and saved theirs for recovery.
        </p>
      )}
      {status.pending.length > 0 && <RetrySyncButton />}
      <Row icon="rocket_launch" title="Website rebuild">
        {!status.rebuild.configured ? (
          "Not configured. The website still shows changes after each page load."
        ) : status.rebuild.pending ? (
          "Waiting to start (at most one every 5 minutes)"
        ) : status.rebuild.lastRebuildAt ? (
          <>
            Last started <RelativeTime iso={status.rebuild.lastRebuildAt} />
          </>
        ) : (
          "Not started yet"
        )}
      </Row>
    </Card>
  );
}
