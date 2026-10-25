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
  dot?: string;
  count?: number;
  children: ReactNode;
};

export function FilterChip({
  selected,
  onSelectedChange,
  icon,
  dot,
  count,
  className,
  children,
  onClick,
  type = "button",
  ...props
}: FilterChipProps) {
  return (
    <button
      type={type}
      aria-pressed={selected}
      onClick={(event) => {
        onClick?.(event);
        onSelectedChange?.(!selected);
      }}
      className={cn(
        "focus-ring inline-flex h-10 shrink-0 cursor-pointer items-center gap-1.5 pe-3.5 text-label-large",
        "transition-[border-radius,background-color,box-shadow,padding,scale] duration-[500ms,300ms,300ms,400ms,500ms] ease-emph active:scale-95",
        "disabled:cursor-default disabled:opacity-38",
        selected
          ? "rounded-[20px] bg-secondary-container ps-2.5 text-on-secondary-container"
          : "rounded-[10px] ps-3.5 text-on-surface ring-1 ring-outline ring-inset hover:bg-surface-container-high",
        className,
      )}
      {...props}
    >
      <span
        className={cn(
          "flex overflow-hidden transition-[width] duration-[400ms] ease-emph",
          selected ? "w-[18px]" : "w-0",
        )}
        aria-hidden
      >
        <Icon name="check" size={18} />
      </span>
      {!selected && icon && <Icon name={icon} size={18} />}
      {dot && <span className="size-2.5 shrink-0 rounded-full" style={{ background: dot }} aria-hidden />}
      {children}
      {count !== undefined && <span className="text-label-medium font-semibold opacity-70">{count}</span>}
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
