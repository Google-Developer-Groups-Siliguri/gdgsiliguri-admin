import type { HTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/cn";

export function List({ className, ...props }: HTMLAttributes<HTMLUListElement>) {
  return <ul role="list" className={cn("flex flex-col py-2", className)} {...props} />;
}

export type ListItemProps = Omit<HTMLAttributes<HTMLLIElement>, "children"> & {
  headline: ReactNode;
  supportingText?: ReactNode;
  overline?: ReactNode;
  leading?: ReactNode;
  trailing?: ReactNode;
  interactive?: boolean;
  selected?: boolean;
};

export function ListItem({
  headline,
  supportingText,
  overline,
  leading,
  trailing,
  interactive = false,
  selected = false,
  className,
  ...props
}: ListItemProps) {
  return (
    <li
      className={cn(
        "flex min-h-14 items-center gap-4 py-2 ps-4 pe-6",
        Boolean(supportingText) && "min-h-18",
        interactive && "state-layer cursor-pointer",
        selected && "bg-secondary-container text-on-secondary-container",
        className,
      )}
      {...props}
    >
      {leading && <div className="flex shrink-0 items-center text-on-surface-variant">{leading}</div>}
      <div className="flex min-w-0 flex-1 flex-col">
        {overline && (
          <span className="truncate text-label-small text-on-surface-variant">{overline}</span>
        )}
        <span className="truncate text-body-large text-on-surface">{headline}</span>
        {supportingText && (
          <span className="line-clamp-2 text-body-medium text-on-surface-variant">
            {supportingText}
          </span>
        )}
      </div>
      {trailing && (
        <div className="flex shrink-0 items-center gap-1 text-on-surface-variant">{trailing}</div>
      )}
    </li>
  );
}
