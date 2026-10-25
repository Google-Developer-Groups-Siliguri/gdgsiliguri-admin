import type { ButtonHTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/cn";

import { Icon } from "./Icon";

const BASE =
  "state-layer focus-ring press inline-flex h-9 shrink-0 cursor-pointer items-center gap-1.5 rounded-full text-label-large active:rounded-sm disabled:cursor-default disabled:opacity-38";

export type AssistChipProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  icon?: string;
  elevated?: boolean;
  children: ReactNode;
};

export function AssistChip({
  icon,
  elevated,
  className,
  children,
  type = "button",
  ...props
}: AssistChipProps) {
  return (
    <button
      type={type}
      className={cn(
        BASE,
        icon ? "ps-3 pe-4" : "px-4",
        elevated
          ? "bg-surface-container-highest text-on-surface"
          : "bg-surface-container-high text-on-surface",
        className,
      )}
      {...props}
    >
      {icon && <Icon name={icon} size={18} className="text-primary" />}
      {children}
    </button>
  );
}

export type FilterChipProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "onChange"> & {
  selected: boolean;
  onSelectedChange?: (selected: boolean) => void;
  icon?: string;
  children: ReactNode;
};

export function FilterChip({
  selected,
  onSelectedChange,
  icon,
  className,
  children,
  onClick,
  type = "button",
  ...props
}: FilterChipProps) {
  const leading = selected ? "check" : icon;
  return (
    <button
      type={type}
      aria-pressed={selected}
      onClick={(event) => {
        onClick?.(event);
        onSelectedChange?.(!selected);
      }}
      className={cn(
        BASE,
        leading ? "ps-3 pe-4" : "px-4",
        selected
          ? "bg-secondary-container text-on-secondary-container"
          : "bg-surface-container-high text-on-surface-variant",
        className,
      )}
      {...props}
    >
      {leading && <Icon name={leading} size={18} />}
      {children}
    </button>
  );
}

export type InputChipProps = {
  children: ReactNode;
  onRemove?: () => void;
  avatar?: string;
  icon?: string;
  className?: string;
  removeLabel?: string;
};

export function InputChip({
  children,
  onRemove,
  avatar,
  icon,
  className,
  removeLabel = "Remove",
}: InputChipProps) {
  return (
    <span
      className={cn(
        "inline-flex h-9 shrink-0 items-center gap-2 rounded-full bg-surface-container-high text-label-large text-on-surface-variant",
        avatar ? "ps-1" : icon ? "ps-2" : "ps-3",
        onRemove ? "pe-1" : "pe-3",
        className,
      )}
    >
      {avatar && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={avatar} alt="" className="size-6 rounded-full object-cover" />
      )}
      {!avatar && icon && <Icon name={icon} size={18} />}
      {children}
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          aria-label={removeLabel}
          className="state-layer focus-ring inline-flex size-6 cursor-pointer items-center justify-center rounded-full"
        >
          <Icon name="close" size={18} />
        </button>
      )}
    </span>
  );
}
