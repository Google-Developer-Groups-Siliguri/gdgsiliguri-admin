"use client";

import { Tabs as RadixTabs } from "radix-ui";
import type { ComponentProps, ReactNode } from "react";

import { cn } from "@/lib/cn";

import { Icon } from "./Icon";

export const Tabs = RadixTabs.Root;

export function TabList({ className, ...props }: ComponentProps<typeof RadixTabs.List>) {
  return (
    <RadixTabs.List
      className={cn(
        "flex overflow-x-auto border-b border-surface-variant [scrollbar-width:none]",
        className,
      )}
      {...props}
    />
  );
}

type TabProps = ComponentProps<typeof RadixTabs.Trigger> & {
  icon?: string;
  children: ReactNode;
};

export function Tab({ icon, children, className, ...props }: TabProps) {
  return (
    <RadixTabs.Trigger
      className={cn(
        "group state-layer focus-ring relative flex h-12 min-w-24 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-t-lg px-4",
        "transition-colors duration-300",
        "text-title-small text-on-surface-variant data-[state=active]:text-primary",
        className,
      )}
      {...props}
    >
      {icon && <Icon name={icon} size={20} />}
      <span className="relative flex h-full items-center">
        {children}
        <span className="absolute inset-x-0 bottom-0 h-[3px] scale-x-0 rounded-t-full bg-primary transition-[scale] duration-500 ease-spring group-data-[state=active]:scale-x-100" />
      </span>
    </RadixTabs.Trigger>
  );
}

export function TabPanel({ className, ...props }: ComponentProps<typeof RadixTabs.Content>) {
  return <RadixTabs.Content className={cn("outline-none", className)} {...props} />;
}
