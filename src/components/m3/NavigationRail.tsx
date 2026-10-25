"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

import { Icon } from "./Icon";
import { isActive, type NavGroup } from "./navigation";

type NavigationRailProps = {
  groups: NavGroup[];
  header?: ReactNode;
  footer?: ReactNode;
  className?: string;
};

export function NavigationRail({ groups, header, footer, className }: NavigationRailProps) {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Main"
      className={cn(
        "flex w-24 shrink-0 flex-col items-center gap-1 overflow-y-auto bg-surface py-4",
        className,
      )}
    >
      {header && <div className="mb-3 flex flex-col items-center gap-3">{header}</div>}
      {groups.map((group, groupIndex) => (
        <div key={group.label} className="flex w-full flex-col items-center gap-1">
          {groupIndex > 0 && <div className="my-2 h-1 w-1 rounded-full bg-outline-variant" />}
          <span className="sr-only">{group.label}</span>
          {group.items.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className="group focus-ring flex w-full flex-col items-center gap-1 rounded-sm py-1 outline-none"
              >
                <span
                  className={cn(
                    "relative flex h-8 w-14 items-center justify-center rounded-full",
                    "transition-[background-color,color,scale,width] duration-[400ms,400ms,500ms,500ms] ease-spring group-active:scale-90",
                    active
                      ? "w-16 bg-secondary-container text-on-secondary-container"
                      : "text-on-surface-variant group-hover:bg-surface-container-high",
                  )}
                >
                  <Icon name={item.icon} filled={active} />
                  {item.badge && (
                    <span className="absolute end-3 top-1 size-1.5 rounded-full bg-error" />
                  )}
                </span>
                <span
                  className={cn(
                    "px-1 text-center text-label-medium",
                    active ? "text-on-surface" : "text-on-surface-variant",
                  )}
                >
                  {item.shortLabel ?? item.label}
                </span>
              </Link>
            );
          })}
        </div>
      ))}
      {footer && <div className="mt-auto flex flex-col items-center gap-3 pt-4">{footer}</div>}
    </nav>
  );
}
