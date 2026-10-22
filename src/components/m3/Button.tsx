import { Slot } from "radix-ui";
import type { ButtonHTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/cn";

import { Icon } from "./Icon";

export type ButtonVariant = "filled" | "tonal" | "outlined" | "text" | "elevated" | "danger";

const VARIANTS: Record<ButtonVariant, string> = {
  filled:
    "bg-primary text-on-primary hover:elevation-1 disabled:bg-on-surface/12 disabled:text-on-surface/38",
  tonal:
    "bg-secondary-container text-on-secondary-container hover:elevation-1 disabled:bg-on-surface/12 disabled:text-on-surface/38",
  outlined:
    "border border-outline text-primary disabled:border-on-surface/12 disabled:text-on-surface/38",
  text: "text-primary disabled:text-on-surface/38",
  elevated:
    "bg-surface-container-low text-primary elevation-1 hover:elevation-2 disabled:bg-on-surface/12 disabled:text-on-surface/38 disabled:shadow-none",
  danger:
    "bg-error text-on-error hover:elevation-1 disabled:bg-on-surface/12 disabled:text-on-surface/38",
};

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  icon?: string;
  trailingIcon?: string;
  asChild?: boolean;
  children: ReactNode;
};

export function Button({
  variant = "filled",
  icon,
  trailingIcon,
  asChild = false,
  className,
  children,
  type = "button",
  ...props
}: ButtonProps) {
  const classes = cn(
    "state-layer focus-ring inline-flex h-10 shrink-0 cursor-pointer select-none items-center justify-center gap-2 rounded-full text-label-large whitespace-nowrap",
    "transition-[box-shadow,background-color] duration-short ease-standard disabled:cursor-default",
    icon ? "ps-4 pe-6" : trailingIcon ? "ps-6 pe-4" : "px-6",
    variant === "text" && (icon ? "ps-3 pe-4" : "px-3"),
    VARIANTS[variant],
    className,
  );
  if (asChild) {
    return (
      <Slot.Root className={classes} {...props}>
        {children}
      </Slot.Root>
    );
  }
  return (
    <button type={type} className={classes} {...props}>
      {icon && <Icon name={icon} size={18} />}
      {children}
      {trailingIcon && <Icon name={trailingIcon} size={18} />}
    </button>
  );
}
