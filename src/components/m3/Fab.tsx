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
        "state-layer focus-ring inline-flex h-14 shrink-0 cursor-pointer items-center justify-center gap-3 rounded-lg",
        "transition-shadow duration-short ease-standard",
        lowered ? "elevation-1 hover:elevation-2" : "elevation-3 hover:elevation-4",
        extended ? "ps-4 pe-5 text-label-large" : "w-14",
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
