import Link from "next/link";

import { RelativeTime } from "@/components/RelativeTime";
import { Card } from "@/components/m3/Card";
import { Icon } from "@/components/m3/Icon";
import { SectionToggle } from "@/components/section/SectionToggle";
import { sectionStatus, StatusChip } from "@/components/section/StatusChip";
import type { Visibility } from "@/lib/cms/queries";
import type { SectionState } from "@/lib/cms/repository";
import { itemCount } from "@/lib/cms/repository";
import { cn } from "@/lib/cn";
import type { SectionDef } from "@/lib/sections/registry";
import { formatDateTime } from "@/lib/time";

const SHAPES = ["shape-cookie9", "shape-clover4", "shape-sunny", "shape-cookie6", "shape-pentagon"];
const TONES = [
  "bg-primary-container text-on-primary-container",
  "bg-tertiary-container text-on-tertiary-container",
  "bg-secondary-container text-on-secondary-container",
];

type SectionCardProps = {
  def: Pick<SectionDef, "id" | "label" | "href" | "icon">;
  state?: SectionState;
  visibility: Visibility;
  index?: number;
  warningCount?: number;
};

export function SectionCard({ def, state, visibility, index = 0, warningCount = 0 }: SectionCardProps) {
  if (!state) {
    return (
      <Card variant="outlined" className="flex flex-col gap-2 rounded-[28px] p-5">
        <span className="flex items-center gap-2 text-title-medium">
          <Icon name={def.icon} className="text-on-surface-variant" />
          {def.label}
        </span>
        <span className="text-body-medium text-error">Not migrated yet. Run npm run migrate:v2.</span>
      </Card>
    );
  }
  const count = itemCount(state.draft);

  return (
    <Card
      variant="tinted"
      className="group lift relative flex h-full flex-col gap-4 rounded-[28px_28px_28px_8px] bg-surface-container p-5 text-on-surface hover:rounded-[28px] hover:bg-surface-container-high"
    >
      <div className="flex items-start gap-3">
        <span
          className={cn(
            "grid size-12 shrink-0 place-items-center transition-[rotate] duration-700 ease-spring group-hover:rotate-[30deg]",
            SHAPES[index % SHAPES.length],
            TONES[index % TONES.length],
          )}
        >
          <Icon name={def.icon} className="transition-[rotate] duration-700 ease-spring group-hover:-rotate-[30deg]" />
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <Link
            href={def.href}
            className="focus-ring truncate rounded-xs font-display text-[20px] leading-tight font-bold tracking-[-0.01em] text-on-surface after:absolute after:inset-0 after:rounded-[28px]"
          >
            {def.label}
          </Link>
          <span className="text-body-medium text-on-surface-variant">
            {count === null ? "Always shown" : `${count} ${count === 1 ? "item" : "items"}`}
          </span>
        </div>
        {visibility && (
          <div className="relative z-10">
            <SectionToggle sectionId={def.id} label={def.label} enabled={visibility.enabled} />
          </div>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <StatusChip status={sectionStatus(visibility?.enabled ?? null, state.hasDraftChanges)} />
        {warningCount > 0 && (
          <span className="inline-flex items-center gap-1 text-label-medium font-semibold text-tertiary">
            <Icon name="warning" size={16} filled />
            {warningCount} to check
          </span>
        )}
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
