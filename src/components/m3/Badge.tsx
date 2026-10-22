import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

type BadgeProps = {
  value?: number | string;
  children?: ReactNode;
  className?: string;
  label?: string;
};

export function Badge({ value, children, className, label }: BadgeProps) {
  const dot = value === undefined;
  const text = typeof value === "number" && value > 999 ? "999+" : value;
  const badge = (
    <span
      aria-label={label}
      className={cn(
        "inline-flex items-center justify-center rounded-full bg-error text-label-small text-on-error",
        dot ? "size-1.5" : "h-4 min-w-4 px-1",
        children ? "absolute" : "",
        Boolean(children) && (dot ? "end-0 top-0" : "-end-1.5 -top-1"),
        className,
      )}
    >
      {!dot && text}
    </span>
  );
  if (!children) return badge;
  return (
    <span className="relative inline-flex">
      {children}
      {badge}
    </span>
  );
}
