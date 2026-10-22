"use client";

import { AlertDialog, Dialog as RadixDialog } from "radix-ui";
import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

import { Button } from "./Button";
import { Icon } from "./Icon";
import { IconButton } from "./IconButton";

type DialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  icon?: string;
  description?: ReactNode;
  children?: ReactNode;
  actions?: ReactNode;
  fullScreenOnMobile?: boolean;
  confirmLabel?: string;
  onConfirm?: () => void;
  confirmDisabled?: boolean;
  wide?: boolean;
};

export function Dialog({
  open,
  onOpenChange,
  title,
  icon,
  description,
  children,
  actions,
  fullScreenOnMobile = false,
  confirmLabel,
  onConfirm,
  confirmDisabled,
  wide = false,
}: DialogProps) {
  return (
    <RadixDialog.Root open={open} onOpenChange={onOpenChange}>
      <RadixDialog.Portal>
        <RadixDialog.Overlay className="fixed inset-0 z-40 bg-scrim/32 animate-fade-in" />
        <RadixDialog.Content
          className={cn(
            "fixed z-50 flex flex-col bg-surface-container-high text-on-surface outline-none [--field-bg:var(--md-sys-color-surface-container-high)]",
            fullScreenOnMobile
              ? "inset-0 animate-slide-up compact:inset-auto compact:top-1/2 compact:left-1/2 compact:max-h-[min(90dvh,880px)] compact:-translate-x-1/2 compact:-translate-y-1/2 compact:rounded-xl compact:animate-scale-in"
              : "top-1/2 left-1/2 max-h-[90dvh] w-[calc(100%-48px)] -translate-x-1/2 -translate-y-1/2 rounded-xl animate-scale-in",
            wide ? "compact:w-[min(720px,calc(100%-48px))]" : "compact:w-[min(560px,calc(100%-48px))]",
            !fullScreenOnMobile && "max-w-[560px] min-w-[280px]",
            !fullScreenOnMobile && wide && "max-w-[720px]",
          )}
        >
          {fullScreenOnMobile && (
            <div className="flex h-14 items-center gap-1 px-1 compact:hidden">
              <RadixDialog.Close asChild>
                <IconButton icon="close" label="Close" />
              </RadixDialog.Close>
              <RadixDialog.Title className="flex-1 truncate px-2 text-title-large">
                {title}
              </RadixDialog.Title>
              {onConfirm && confirmLabel && (
                <Button variant="text" onClick={onConfirm} disabled={confirmDisabled}>
                  {confirmLabel}
                </Button>
              )}
            </div>
          )}
          <div
            className={cn(
              "flex flex-col gap-4 px-6 pt-6",
              icon && "items-center text-center",
              fullScreenOnMobile && "hidden compact:flex",
            )}
          >
            {icon && <Icon name={icon} className="text-secondary" />}
            {fullScreenOnMobile ? (
              <span className="text-headline-small" aria-hidden>
                {title}
              </span>
            ) : (
              <RadixDialog.Title className="text-headline-small">{title}</RadixDialog.Title>
            )}
          </div>
          {description ? (
            <RadixDialog.Description className="px-6 pt-4 text-body-medium text-on-surface-variant">
              {description}
            </RadixDialog.Description>
          ) : (
            <RadixDialog.Description className="sr-only">{title}</RadixDialog.Description>
          )}
          {children && <div className="min-h-0 flex-1 overflow-y-auto px-6 pt-4 pb-2">{children}</div>}
          <div
            className={cn(
              "flex flex-wrap justify-end gap-2 px-6 pt-4 pb-6",
              fullScreenOnMobile && "hidden compact:flex",
            )}
          >
            {actions ?? (
              <>
                <RadixDialog.Close asChild>
                  <Button variant="text">Cancel</Button>
                </RadixDialog.Close>
                {onConfirm && confirmLabel && (
                  <Button variant="text" onClick={onConfirm} disabled={confirmDisabled}>
                    {confirmLabel}
                  </Button>
                )}
              </>
            )}
          </div>
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
}

type ConfirmDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: ReactNode;
  confirmLabel: string;
  onConfirm: () => void;
  icon?: string;
  destructive?: boolean;
  busy?: boolean;
};

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  onConfirm,
  icon,
  destructive = false,
  busy = false,
}: ConfirmDialogProps) {
  return (
    <AlertDialog.Root open={open} onOpenChange={onOpenChange}>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="fixed inset-0 z-40 bg-scrim/32 animate-fade-in" />
        <AlertDialog.Content className="fixed top-1/2 left-1/2 z-50 flex w-[calc(100%-48px)] max-w-[560px] min-w-[280px] -translate-x-1/2 -translate-y-1/2 flex-col gap-4 rounded-xl bg-surface-container-high p-6 text-on-surface outline-none animate-scale-in compact:w-auto">
          <div className={cn("flex flex-col gap-4", icon && "items-center text-center")}>
            {icon && <Icon name={icon} className={destructive ? "text-error" : "text-secondary"} />}
            <AlertDialog.Title className="text-headline-small">{title}</AlertDialog.Title>
          </div>
          <AlertDialog.Description className="text-body-medium text-on-surface-variant">
            {description}
          </AlertDialog.Description>
          <div className="flex justify-end gap-2 pt-2">
            <AlertDialog.Cancel asChild>
              <Button variant="text" disabled={busy}>
                Cancel
              </Button>
            </AlertDialog.Cancel>
            <Button
              variant="text"
              className={destructive ? "text-error" : undefined}
              onClick={onConfirm}
              disabled={busy}
            >
              {confirmLabel}
            </Button>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
