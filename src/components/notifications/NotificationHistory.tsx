"use client";

import Link from "next/link";

import { RelativeTime } from "@/components/RelativeTime";
import { Button } from "@/components/m3/Button";
import { cn } from "@/lib/cn";
import { failureReason, type DisplayStatus, type NotificationView } from "@/lib/cms/notification-fields";

export const STATUS_LABELS: Record<DisplayStatus, string> = {
  draft: "Draft",
  sending: "Sending",
  sent: "Accepted by FCM",
  failed: "Failed",
  unknown: "Unknown: check a device before resending",
};

const STATUS_TONES: Record<DisplayStatus, string> = {
  draft: "bg-surface-container-highest text-on-surface-variant",
  sending: "bg-secondary-container text-on-secondary-container",
  sent: "bg-primary-container text-on-primary-container",
  failed: "bg-error-container text-on-error-container",
  unknown: "bg-tertiary-container text-on-tertiary-container",
};

export function StatusChip({ status }: { status: DisplayStatus }) {
  return (
    <span className={cn("inline-flex w-fit rounded-sm px-2 py-0.5 text-label-medium", STATUS_TONES[status])}>
      {STATUS_LABELS[status]}
    </span>
  );
}

function Details({ item }: { item: NotificationView }) {
  if (item.status === "draft") {
    return (
      <>
        Draft by {item.updatedBy} · <RelativeTime iso={item.updatedAt} />
        {item.lastTestAt && (
          <>
            {" "}
            · tested <RelativeTime iso={item.lastTestAt} />
          </>
        )}
      </>
    );
  }
  return (
    <>
      To everyone · {item.sentBy} · <RelativeTime iso={item.sentAt ?? item.sendStartedAt} />
    </>
  );
}

type HistoryProps = {
  items: NotificationView[];
  selectedId: string | null;
  onSelect: (item: NotificationView) => void;
  after: string | null;
  next: string | null;
};

export function NotificationHistory({ items, selectedId, onSelect, after, next }: HistoryProps) {
  return (
    <section aria-labelledby="history-heading" className="flex flex-col gap-3">
      <h2 id="history-heading" className="text-title-large">
        History
      </h2>
      {items.length === 0 ? (
        <p className="rounded-lg bg-surface-container px-5 py-6 text-body-medium text-on-surface-variant">
          No announcements yet.
        </p>
      ) : (
        <ol className="segmented-list" aria-label="Announcements">
          {items.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => onSelect(item)}
                aria-current={item.id === selectedId || undefined}
                className={cn(
                  "focus-ring flex w-full cursor-pointer flex-col items-start gap-1 px-4 py-3 text-start",
                  item.id === selectedId && "bg-secondary-container/40",
                )}
              >
                <span className="flex w-full flex-wrap items-center gap-2">
                  <span className="min-w-0 flex-1 truncate font-display text-[17px] font-bold text-on-surface">
                    {item.title}
                  </span>
                  <StatusChip status={item.displayStatus} />
                </span>
                <span className="text-body-small text-on-surface-variant">
                  <Details item={item} />
                </span>
                {item.status === "failed" && (
                  <span className="text-body-small font-semibold text-error">{failureReason(item.errorCode)}</span>
                )}
              </button>
            </li>
          ))}
        </ol>
      )}
      <div className="flex flex-wrap gap-2">
        {after && (
          <Button variant="tonal" icon="vertical_align_top" asChild>
            <Link href="/notifications">Newest</Link>
          </Button>
        )}
        {next && (
          <Button variant="tonal" trailingIcon="arrow_downward" asChild>
            <Link href={`/notifications?after=${encodeURIComponent(next)}`}>Older</Link>
          </Button>
        )}
      </div>
      <p className="text-body-small text-on-surface-variant">
        &ldquo;Accepted by FCM&rdquo; means Firebase took the message, not that phones showed it. For delivery
        numbers, open the Firebase console → Messaging → Reports.
      </p>
    </section>
  );
}
