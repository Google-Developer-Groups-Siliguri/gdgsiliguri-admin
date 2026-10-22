import type { HTMLAttributes } from "react";

import { cn } from "@/lib/cn";

export type CardVariant = "elevated" | "filled" | "outlined" | "tinted";

const VARIANTS: Record<CardVariant, string> = {
  elevated:
    "bg-surface-container-low elevation-1 [--field-bg:var(--md-sys-color-surface-container-low)]",
  filled:
    "bg-surface-container-highest [--field-bg:var(--md-sys-color-surface-container-highest)]",
  outlined: "bg-surface border border-outline-variant [--field-bg:var(--md-sys-color-surface)]",
  tinted: "",
};

export type CardProps = HTMLAttributes<HTMLDivElement> & {
  variant?: CardVariant;
};

export function Card({ variant = "outlined", className, ...props }: CardProps) {
  return (
    <div
      className={cn("rounded-md", variant !== "tinted" && "text-on-surface", VARIANTS[variant], className)}
      {...props}
    />
  );
}
