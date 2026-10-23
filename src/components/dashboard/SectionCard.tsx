import Link from "next/link";

import { RelativeTime } from "@/components/RelativeTime";
import { Card } from "@/components/m3/Card";
import { Icon } from "@/components/m3/Icon";
import { SectionToggle } from "@/components/section/SectionToggle";
import { sectionStatus, StatusChip } from "@/components/section/StatusChip";
import type { SectionState } from "@/lib/content/repository";
import { isEnabled, itemCount, SECTIONS, type SectionKey } from "@/lib/content/sections";
import { formatDateTime } from "@/lib/time";

export function SectionCard({ sectionKey, state }: { sectionKey: SectionKey; state?: SectionState }) {
  const definition = SECTIONS[sectionKey];
  if (!state) {
    return (
      <Card variant="outlined" className="flex flex-col gap-2 p-4">
        <span className="flex items-center gap-2 text-title-medium">
          <Icon name={definition.icon} className="text-on-surface-variant" />
          {definition.label}
        </span>
        <span className="text-body-medium text-error">Not imported yet. Run npm run import:rtdb.</span>
      </Card>
    );
  }
  const enabled = isEnabled(sectionKey, state.published);
  const count = itemCount(sectionKey, state.draft);

  return (
    <Card variant="outlined" className="relative flex flex-col gap-3 p-4">
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-secondary-container text-on-secondary-container">
          <Icon name={definition.icon} />
        </span>
        <div className="flex min-w-0 flex-1 flex-col">
          <Link
            href={definition.href}
            className="focus-ring truncate rounded-xs text-title-medium text-on-surface after:absolute after:inset-0 after:rounded-md hover:underline"
          >
            {definition.label}
          </Link>
          <span className="text-body-medium text-on-surface-variant">
            {count === null ? "Always shown" : `${count} ${count === 1 ? "item" : "items"}`}
          </span>
        </div>
        {enabled !== null && (
          <div className="relative z-10">
            <SectionToggle sectionKey={sectionKey} enabled={enabled} version={state.version} />
          </div>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <StatusChip status={sectionStatus(enabled, state.hasDraftChanges)} />
        <span
          className="min-w-0 truncate text-body-small text-on-surface-variant"
          title={formatDateTime(state.publishedAt)}
        >
          <RelativeTime iso={state.publishedAt} />
          {state.publishedBy ? ` · ${state.publishedBy}` : ""}
        </span>
      </div>
    </Card>
  );
}
