import type { ButtonHTMLAttributes } from "react";

import { cn } from "@/lib/cn";

import { Icon } from "./Icon";

type FabColor = "primary" | "secondary" | "tertiary" | "surface";

const COLORS: Record<FabColor, string> = {
  primary: "bg-primary-container text-on-primary-container",
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
        "state-layer focus-ring press animate-pop-in inline-flex shrink-0 cursor-pointer items-center justify-center gap-3",
        lowered ? "elevation-1" : "shadow-[0_12px_28px_-12px_rgb(0_0_0/0.55)]",
        extended
          ? "h-18 rounded-[24px] ps-6 pe-7 font-display text-[17px] font-extrabold hover:rounded-[36px]"
          : "size-14 rounded-[18px] hover:rounded-[28px]",
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
