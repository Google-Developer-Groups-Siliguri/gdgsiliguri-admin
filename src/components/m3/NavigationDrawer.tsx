"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Dialog as RadixDialog } from "radix-ui";
import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

import { Icon } from "./Icon";
import { isActive, type NavGroup } from "./navigation";

type NavigationDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groups: NavGroup[];
  header?: ReactNode;
  footer?: ReactNode;
};

export function NavigationDrawerContent({
  groups,
  onNavigate,
}: {
  groups: NavGroup[];
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  return (
    <nav aria-label="Main" className="flex flex-col">
      {groups.map((group, groupIndex) => (
        <div key={group.label} className="flex flex-col">
          {groupIndex > 0 && <div className="mx-4 my-2 h-px bg-outline-variant" />}
          <span className="flex h-14 items-center px-4 text-title-small text-on-surface-variant">
            {group.label}
          </span>
          {group.items.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "state-layer focus-ring flex h-14 items-center gap-3 rounded-full ps-4 pe-6 text-label-large",
                  active
                    ? "bg-secondary-container text-on-secondary-container"
                    : "text-on-surface-variant",
                )}
              >
                <Icon name={item.icon} filled={active} />
                <span className="flex-1">{item.label}</span>
                {item.badge && <span className="size-1.5 rounded-full bg-error" />}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}

export function NavigationDrawer({
  open,
  onOpenChange,
  groups,
  header,
  footer,
}: NavigationDrawerProps) {
  return (
    <RadixDialog.Root open={open} onOpenChange={onOpenChange}>
      <RadixDialog.Portal>
        <RadixDialog.Overlay className="fixed inset-0 z-40 bg-scrim/32 animate-fade-in" />
        <RadixDialog.Content className="fixed inset-y-0 start-0 z-50 flex w-[min(360px,calc(100%-56px))] flex-col overflow-y-auto rounded-e-lg bg-surface-container-low p-3 text-on-surface outline-none animate-slide-in-left">
          <RadixDialog.Title className="sr-only">Navigation</RadixDialog.Title>
          <RadixDialog.Description className="sr-only">Main navigation</RadixDialog.Description>
          {header && <div className="flex items-center gap-3 px-4 py-4">{header}</div>}
          <NavigationDrawerContent groups={groups} onNavigate={() => onOpenChange(false)} />
          {footer && <div className="mt-auto px-4 pt-4">{footer}</div>}
          <RadixDialog.Close className="sr-only">
            <Icon name="close" />
            Close navigation
          </RadixDialog.Close>
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
}
