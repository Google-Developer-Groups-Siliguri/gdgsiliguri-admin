"use client";

import type { ReactNode } from "react";

import { SnackbarProvider } from "@/components/m3/Snackbar";
import { TooltipProvider } from "@/components/m3/Tooltip";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <TooltipProvider>
      <SnackbarProvider>{children}</SnackbarProvider>
    </TooltipProvider>
  );
}
