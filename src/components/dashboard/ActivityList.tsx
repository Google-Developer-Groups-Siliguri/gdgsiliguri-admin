import { RelativeTime } from "@/components/RelativeTime";
import { Icon } from "@/components/m3/Icon";
import type { AuditAction, AuditEntry } from "@/lib/content/repository";
import { formatDateTime } from "@/lib/time";

const ACTION_ICONS: Record<AuditAction, string> = {
  save_draft: "edit_note",
  publish: "publish",
  toggle: "toggle_on",
  revert: "restore",
  rebuild: "rocket_launch",
  admin_add: "person_add",
  admin_remove: "person_remove",
  admin_role: "manage_accounts",
};

export function ActivityList({ entries }: { entries: AuditEntry[] }) {
  if (entries.length === 0) {
    return (
      <p className="rounded-lg bg-surface-container px-5 py-6 text-body-medium text-on-surface-variant">
        No activity yet.
      </p>
    );
  }
  return (
    <ol className="segmented-list">
      {entries.map((entry, index) => (
        <li key={entry.id} className="flex items-start gap-4 px-4 py-3 animate-rise" style={{ animationDelay: `${Math.min(index, 8) * 50}ms` }}>
          <span className="shape-cookie6 mt-0.5 flex size-9 shrink-0 items-center justify-center bg-secondary-container text-on-secondary-container">
            <Icon name={ACTION_ICONS[entry.action] ?? "info"} size={18} />
          </span>
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="text-body-medium text-on-surface">{entry.summary}</span>
            <span className="truncate text-body-small text-on-surface-variant" title={formatDateTime(entry.at)}>
              {entry.actorEmail} · <RelativeTime iso={entry.at} />
            </span>
          </div>
        </li>
      ))}
    </ol>
  );
}
