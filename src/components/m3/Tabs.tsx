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
        "flex max-w-full gap-1 self-start overflow-x-auto rounded-[28px] bg-surface-container p-1",
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
        "group focus-ring flex h-11 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-full ps-3.5 pe-4.5 text-label-large",
        "transition-[background-color,color,scale] duration-[400ms,400ms,500ms] ease-spring active:scale-95",
        "text-on-surface-variant hover:bg-surface-container-high",
        "data-[state=active]:bg-surface-container-lowest data-[state=active]:text-primary data-[state=active]:shadow-[0_2px_8px_-4px_rgb(0_0_0/0.3)]",
        className,
      )}
      {...props}
    >
      {icon && <Icon name={icon} size={20} className="group-data-[state=active]:[font-variation-settings:'FILL'_1]" />}
      {children}
    </RadixTabs.Trigger>
  );
}

export function TabPanel({ className, ...props }: ComponentProps<typeof RadixTabs.Content>) {
  return <RadixTabs.Content className={cn("outline-none", className)} {...props} />;
}
