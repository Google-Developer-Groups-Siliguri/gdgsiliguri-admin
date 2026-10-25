import { Icon } from "@/components/m3/Icon";
import { cn } from "@/lib/cn";

export type SectionStatus = "published" | "draft" | "disabled";

const STYLES: Record<SectionStatus, { label: string; icon: string; className: string }> = {
  published: {
    label: "Published",
    icon: "check_circle",
    className: "bg-secondary-container text-on-secondary-container",
  },
  draft: {
    label: "Draft changes",
    icon: "edit_note",
    className: "bg-tertiary-container text-on-tertiary-container",
  },
  disabled: {
    label: "Disabled",
    icon: "visibility_off",
    className: "bg-surface-container-highest text-on-surface-variant",
  },
};

export function sectionStatus(enabled: boolean | null, hasChanges: boolean): SectionStatus {
  if (hasChanges) return "draft";
  if (enabled === false) return "disabled";
  return "published";
}

export function StatusChip({ status, className }: { status: SectionStatus; className?: string }) {
  const style = STYLES[status];
  return (
    <span
      className={cn(
        "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full ps-2.5 pe-3.5 text-label-large",
        style.className,
        className,
      )}
    >
      <Icon name={style.icon} size={18} />
      {style.label}
    </span>
  );
}
