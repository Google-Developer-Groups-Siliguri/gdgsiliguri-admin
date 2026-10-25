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
          sideOffset={6}
          className="z-50 origin-(--radix-dropdown-menu-content-transform-origin) rounded-lg bg-surface-container-high p-1.5 shadow-[0_16px_40px_-16px_rgb(0_0_0/0.5)] animate-pop-in flex min-w-44 max-w-70 flex-col gap-0.5"
        >
          {items.map((item, index) =>
            item.type === "divider" ? (
              <DropdownMenu.Separator key={index} className="mx-3 my-1 h-px bg-outline-variant/60" />
            ) : (
              <DropdownMenu.Item
                key={item.label}
                disabled={item.disabled}
                onSelect={item.onSelect}
                className={cn(
                  "flex h-11 cursor-pointer items-center gap-3 rounded-md px-3 text-label-large outline-none select-none",
                  "transition-[background-color,border-radius] duration-300 ease-emph data-[highlighted]:rounded-lg",
                  "data-[disabled]:cursor-default data-[disabled]:opacity-38",
                  item.destructive
                    ? "text-error data-[highlighted]:bg-error-container data-[highlighted]:text-on-error-container"
                    : "text-on-surface data-[highlighted]:bg-surface-container-highest",
                )}
              >
                {item.icon && (
                  <Icon
                    name={item.icon}
                    className={item.destructive ? "text-current" : "text-on-surface-variant"}
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
