"use client";

import { Dialog as RadixDialog } from "radix-ui";
import type { ReactNode } from "react";

import { IconButton } from "./IconButton";

type SideSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  children: ReactNode;
};

export function SideSheet({ open, onOpenChange, title, children }: SideSheetProps) {
  return (
    <RadixDialog.Root open={open} onOpenChange={onOpenChange}>
      <RadixDialog.Portal>
        <RadixDialog.Overlay className="fixed inset-0 z-40 bg-scrim/32 animate-fade-in" />
        <RadixDialog.Content className="fixed inset-y-0 end-0 z-50 flex w-full max-w-100 flex-col bg-surface-container-low text-on-surface outline-none animate-slide-in-right compact:rounded-s-lg">
          <div className="flex h-16 shrink-0 items-center gap-2 ps-6 pe-3">
            <RadixDialog.Title className="flex-1 truncate text-title-large">{title}</RadixDialog.Title>
            <RadixDialog.Close asChild>
              <IconButton icon="close" label="Close" />
            </RadixDialog.Close>
          </div>
          <RadixDialog.Description className="sr-only">{title}</RadixDialog.Description>
          <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-6">{children}</div>
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
}
