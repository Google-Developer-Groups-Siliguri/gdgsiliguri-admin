"use client";

import { DropdownMenu } from "radix-ui";
import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

import { Icon } from "./Icon";

export type MenuItem =
  | {
      type?: "item";
      label: string;
      icon?: string;
      onSelect: () => void;
      disabled?: boolean;
      destructive?: boolean;
      trailingText?: string;
    }
  | { type: "divider" };

type MenuProps = {
  trigger: ReactNode;
  items: MenuItem[];
  align?: "start" | "center" | "end";
};

export function Menu({ trigger, items, align = "end" }: MenuProps) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>{trigger}</DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align={align}
          sideOffset={4}
          className="z-50 min-w-28 max-w-70 rounded-xs bg-surface-container py-2 elevation-2 animate-fade-in"
        >
          {items.map((item, index) =>
            item.type === "divider" ? (
              <DropdownMenu.Separator key={index} className="my-2 h-px bg-outline-variant" />
            ) : (
              <DropdownMenu.Item
                key={item.label}
                disabled={item.disabled}
                onSelect={item.onSelect}
                className={cn(
                  "state-layer flex h-12 cursor-pointer items-center gap-3 px-3 text-label-large outline-none select-none",
                  "data-[highlighted]:before:opacity-8 data-[disabled]:cursor-default data-[disabled]:opacity-38",
                  item.destructive ? "text-error" : "text-on-surface",
                )}
              >
                {item.icon && (
                  <Icon
                    name={item.icon}
                    className={item.destructive ? "text-error" : "text-on-surface-variant"}
                  />
                )}
                <span className="flex-1">{item.label}</span>
                {item.trailingText && (
                  <span className="text-on-surface-variant">{item.trailingText}</span>
                )}
              </DropdownMenu.Item>
            ),
          )}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
