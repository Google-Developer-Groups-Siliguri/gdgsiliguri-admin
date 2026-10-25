import { Slot } from "radix-ui";
import type { ButtonHTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/cn";

import { Icon } from "./Icon";

export type ButtonVariant = "filled" | "tonal" | "secondary" | "outlined" | "text" | "elevated" | "danger";

const VARIANTS: Record<ButtonVariant, string> = {
  filled: "bg-primary text-on-primary disabled:bg-on-surface/12 disabled:text-on-surface/38",
  tonal:
    "bg-surface-container-high text-on-surface hover:bg-surface-container-highest disabled:bg-on-surface/12 disabled:text-on-surface/38",
  secondary:
    "bg-secondary-container text-on-secondary-container disabled:bg-on-surface/12 disabled:text-on-surface/38",
  outlined:
    "border border-outline text-primary disabled:border-on-surface/12 disabled:text-on-surface/38",
  text: "text-primary disabled:text-on-surface/38",
  elevated:
    "bg-surface-container-low text-primary elevation-1 hover:elevation-2 disabled:bg-on-surface/12 disabled:text-on-surface/38 disabled:shadow-none",
  danger: "bg-error text-on-error disabled:bg-on-surface/12 disabled:text-on-surface/38",
};

const SHAPES = {
  full: "rounded-full active:rounded-sm",
  start: "rounded-[24px_8px_8px_24px] hover:rounded-full",
  end: "rounded-[8px_24px_24px_8px] hover:rounded-full",
};

function padding(variant: ButtonVariant, icon: boolean, trailingIcon: boolean): string {
  if (variant === "text") return icon ? "ps-3 pe-4" : "px-4";
  if (icon) return "ps-4 pe-6";
  return trailingIcon ? "ps-6 pe-4" : "px-6";
}

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: "medium" | "large";
  connected?: "start" | "end";
  icon?: string;
  trailingIcon?: string;
  asChild?: boolean;
  children: ReactNode;
};

export function Button({
  variant = "filled",
  size = "medium",
  connected,
  icon,
  trailingIcon,
  asChild = false,
  className,
  children,
  type = "button",
  ...props
}: ButtonProps) {
  const classes = cn(
    "state-layer focus-ring press inline-flex shrink-0 cursor-pointer select-none items-center justify-center gap-2 text-label-large whitespace-nowrap",
    "disabled:cursor-default",
    size === "large" ? "h-12" : "h-10",
    SHAPES[connected ?? "full"],
    padding(variant, Boolean(icon), Boolean(trailingIcon)),
    VARIANTS[variant],
    className,
  );
  if (asChild) {
    return (
      <Slot.Root className={classes} {...props}>
        {icon && <Icon name={icon} size={18} />}
        <Slot.Slottable>{children}</Slot.Slottable>
        {trailingIcon && <Icon name={trailingIcon} size={18} />}
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
