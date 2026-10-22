"use client";

import { Switch as RadixSwitch } from "radix-ui";
import type { ComponentProps } from "react";

import { cn } from "@/lib/cn";

import { Icon } from "./Icon";

export type SwitchProps = ComponentProps<typeof RadixSwitch.Root> & {
  withIcons?: boolean;
};

export function Switch({ className, withIcons = true, ...props }: SwitchProps) {
  return (
    <RadixSwitch.Root
      className={cn(
        "group focus-ring relative inline-flex h-8 w-13 shrink-0 cursor-pointer items-center rounded-full border-2",
        "transition-colors duration-short ease-standard disabled:cursor-default disabled:opacity-38",
        "border-outline bg-surface-container-highest",
        "data-[state=checked]:border-primary data-[state=checked]:bg-primary",
        className,
      )}
      {...props}
    >
      <span
        aria-hidden
        className={cn(
          "pointer-events-none absolute -inset-2 rounded-full bg-on-surface opacity-0 transition-opacity duration-short",
          "group-hover:opacity-8 group-focus-visible:opacity-10 group-data-[state=checked]:bg-primary",
        )}
      />
      <RadixSwitch.Thumb
        className={cn(
          "relative flex items-center justify-center rounded-full",
          "transition-[margin,width,height,background-color] duration-short ease-emphasized",
          withIcons ? "ms-0.5 size-6" : "ms-1.5 size-4",
          "bg-outline group-active:ms-0.5 group-active:size-7",
          "data-[state=checked]:ms-6 data-[state=checked]:size-6 data-[state=checked]:bg-on-primary",
          "group-active:data-[state=checked]:ms-5 group-active:data-[state=checked]:size-7",
        )}
      >
        {withIcons && (
          <>
            <Icon
              name="check"
              size={18}
              className="hidden text-on-primary-container group-data-[state=checked]:inline-block"
            />
            <Icon
              name="close"
              size={18}
              className="inline-block text-surface-container-highest group-data-[state=checked]:hidden"
            />
          </>
        )}
      </RadixSwitch.Thumb>
    </RadixSwitch.Root>
  );
}
