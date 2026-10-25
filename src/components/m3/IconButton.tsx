import type { ButtonHTMLAttributes } from "react";

import { cn } from "@/lib/cn";

import { Icon } from "./Icon";

export type IconButtonVariant = "standard" | "filled" | "tonal" | "outlined";

const UNTOGGLED: Record<IconButtonVariant, string> = {
  standard: "text-on-surface-variant",
  filled: "bg-primary text-on-primary",
  tonal: "bg-surface-container-high text-on-surface",
  outlined: "border border-outline text-on-surface-variant",
};

const TOGGLE_OFF: Record<IconButtonVariant, string> = {
  standard: "text-on-surface-variant",
  filled: "bg-surface-container-highest text-primary",
  tonal: "bg-surface-container-highest text-on-surface-variant",
  outlined: "border border-outline text-on-surface-variant",
};

const TOGGLE_ON: Record<IconButtonVariant, string> = {
  standard: "text-primary",
  filled: "bg-primary text-on-primary",
  tonal: "bg-secondary-container text-on-secondary-container",
  outlined: "bg-inverse-surface text-inverse-on-surface",
};

export type IconButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> & {
  icon: string;
  label: string;
  variant?: IconButtonVariant;
  selected?: boolean;
  size?: "small" | "medium";
};

function paletteFor(variant: IconButtonVariant, selected: boolean | undefined): string {
  if (selected === undefined) return UNTOGGLED[variant];
  return selected ? TOGGLE_ON[variant] : TOGGLE_OFF[variant];
}

export function IconButton({
  icon,
  label,
  variant = "standard",
  selected,
  size = "medium",
  className,
  type = "button",
  ...props
}: IconButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      aria-pressed={selected}
      className={cn(
        "state-layer focus-ring press inline-flex shrink-0 cursor-pointer items-center justify-center rounded-full",
        "active:rounded-sm disabled:cursor-default disabled:text-on-surface/38",
        size === "medium" ? "size-10" : "size-8",
        variant !== "standard" && "disabled:bg-on-surface/12 disabled:border-on-surface/12",
        paletteFor(variant, selected),
        className,
      )}
      {...props}
    >
      <Icon name={icon} size={size === "medium" ? 24 : 20} filled={selected} />
    </button>
  );
}
