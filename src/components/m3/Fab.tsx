import type { ButtonHTMLAttributes } from "react";

import { cn } from "@/lib/cn";

import { Icon } from "./Icon";

type FabColor = "primary" | "secondary" | "tertiary" | "surface";

const COLORS: Record<FabColor, string> = {
  primary: "bg-primary text-on-primary",
  secondary: "bg-secondary-container text-on-secondary-container",
  tertiary: "bg-tertiary-container text-on-tertiary-container",
  surface: "bg-surface-container-high text-primary",
};

export type FabProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> & {
  icon: string;
  label: string;
  extended?: boolean;
  color?: FabColor;
  lowered?: boolean;
};

export function Fab({
  icon,
  label,
  extended = false,
  color = "primary",
  lowered = false,
  className,
  type = "button",
  ...props
}: FabProps) {
  return (
    <button
      type={type}
      aria-label={extended ? undefined : label}
      title={extended ? undefined : label}
      className={cn(
        "state-layer focus-ring press inline-flex h-14 shrink-0 cursor-pointer items-center justify-center gap-3 rounded-[28px] hover:rounded-[20px]",
        lowered ? "elevation-1" : "shadow-[0_16px_32px_-12px_rgb(0_0_0/0.45)]",
        extended ? "ps-5 pe-6 font-display text-[16px] font-extrabold" : "w-14",
        COLORS[color],
        className,
      )}
      {...props}
    >
      <Icon name={icon} />
      {extended && <span>{label}</span>}
    </button>
  );
}
