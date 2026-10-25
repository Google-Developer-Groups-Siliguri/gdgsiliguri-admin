import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

type TopAppBarProps = {
  title: ReactNode;
  navigation?: ReactNode;
  actions?: ReactNode;
  scrolled?: boolean;
  className?: string;
};

export function TopAppBar({ title, navigation, actions, scrolled, className }: TopAppBarProps) {
  return (
    <header
      className={cn(
        "sticky top-0 z-30 flex h-16 shrink-0 items-center gap-1 px-1 transition-colors duration-short",
        scrolled ? "bg-surface-container" : "bg-surface",
        className,
      )}
    >
      {navigation}
      <div className={cn("min-w-0 flex-1 truncate font-display text-[20px] font-bold", !navigation && "ps-3")}>
        {title}
      </div>
      {actions && <div className="flex items-center gap-1 pe-1">{actions}</div>}
    </header>
  );
}
