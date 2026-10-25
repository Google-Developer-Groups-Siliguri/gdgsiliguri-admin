"use client";

import { Toast } from "radix-ui";
import { createContext, use, useCallback, useMemo, useState, type ReactNode } from "react";

import { IconButton } from "./IconButton";

type SnackbarMessage = {
  id: number;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  duration?: number;
  tone?: "default" | "error";
};

type ShowSnackbar = (snackbar: Omit<SnackbarMessage, "id">) => void;

const SnackbarContext = createContext<ShowSnackbar | null>(null);

export function SnackbarProvider({ children }: { children: ReactNode }) {
  const [queue, setQueue] = useState<SnackbarMessage[]>([]);
  const show = useCallback<ShowSnackbar>((snackbar) => {
    setQueue((current) => [...current, { ...snackbar, id: Date.now() + Math.random() }]);
  }, []);
  const current = queue[0];
  const dismiss = useCallback(() => setQueue((items) => items.slice(1)), []);
  const value = useMemo(() => show, [show]);

  return (
    <SnackbarContext value={value}>
      <Toast.Provider swipeDirection="down" label="Notification">
        {children}
        {current && (
          <Toast.Root
            key={current.id}
            duration={current.duration ?? (current.actionLabel ? 8000 : 4000)}
            onOpenChange={(open) => !open && dismiss()}
            className="flex min-h-12 w-full items-center gap-2 rounded-lg bg-inverse-surface py-1.5 ps-5 pe-2 text-inverse-on-surface shadow-[0_16px_40px_-16px_rgb(0_0_0/0.5)] animate-snack-in compact:w-auto compact:min-w-86 compact:max-w-[672px]"
          >
            <Toast.Description
              className={
                current.tone === "error"
                  ? "flex-1 py-2.5 text-body-medium text-[color:var(--md-sys-color-error-container)]"
                  : "flex-1 py-2.5 text-body-medium"
              }
            >
              {current.message}
            </Toast.Description>
            {current.actionLabel && current.onAction && (
              <Toast.Action
                altText={current.actionLabel}
                onClick={current.onAction}
                className="state-layer focus-ring h-10 cursor-pointer rounded-full px-3 text-label-large text-inverse-primary"
              >
                {current.actionLabel}
              </Toast.Action>
            )}
            <Toast.Close asChild>
              <IconButton icon="close" label="Dismiss" className="text-inverse-on-surface" />
            </Toast.Close>
          </Toast.Root>
        )}
        <Toast.Viewport className="fixed inset-x-4 bottom-4 z-[60] flex flex-col items-center outline-none compact:inset-x-auto compact:start-1/2 compact:-translate-x-1/2 medium:start-6 medium:translate-x-0 medium:items-start" />
      </Toast.Provider>
    </SnackbarContext>
  );
}

export function useSnackbar(): ShowSnackbar {
  const show = use(SnackbarContext);
  if (!show) throw new Error("useSnackbar must be used inside SnackbarProvider");
  return show;
}
