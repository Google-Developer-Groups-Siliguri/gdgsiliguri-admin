"use client";

import { Tooltip as RadixTooltip } from "radix-ui";
import type { ReactNode } from "react";

export function TooltipProvider({ children }: { children: ReactNode }) {
  return (
    <RadixTooltip.Provider delayDuration={500} skipDelayDuration={200}>
      {children}
    </RadixTooltip.Provider>
  );
}

type TooltipProps = {
  content: ReactNode;
  children: ReactNode;
  side?: "top" | "bottom" | "left" | "right";
};

export function Tooltip({ content, children, side = "bottom" }: TooltipProps) {
  return (
    <RadixTooltip.Root>
      <RadixTooltip.Trigger asChild>{children}</RadixTooltip.Trigger>
      <RadixTooltip.Portal>
        <RadixTooltip.Content
          side={side}
          sideOffset={4}
          className="z-50 max-w-xs origin-(--radix-tooltip-content-transform-origin) rounded-sm bg-inverse-surface px-3 py-1.5 text-body-small text-inverse-on-surface animate-pop-in"
        >
          {content}
        </RadixTooltip.Content>
      </RadixTooltip.Portal>
    </RadixTooltip.Root>
  );
}
