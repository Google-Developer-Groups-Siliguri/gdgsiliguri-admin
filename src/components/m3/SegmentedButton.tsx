"use client";

import { useRef, type KeyboardEvent } from "react";

import { cn } from "@/lib/cn";

import { Icon } from "./Icon";

export type Segment = { value: string; label: string; icon?: string };

type SegmentedButtonProps = {
  segments: Segment[];
  value: string;
  onValueChange: (value: string) => void;
  label: string;
  className?: string;
  disabled?: boolean;
};

const STEP: Record<string, number> = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };

export function SegmentedButton({
  segments,
  value,
  onValueChange,
  label,
  className,
  disabled,
}: SegmentedButtonProps) {
  const groupRef = useRef<HTMLDivElement>(null);
  const selectedIndex = segments.findIndex((segment) => segment.value === value);
  const tabStop = selectedIndex === -1 ? 0 : selectedIndex;

  function select(index: number) {
    const next = segments[(index + segments.length) % segments.length];
    onValueChange(next.value);
    groupRef.current?.querySelector<HTMLButtonElement>(`[data-value="${next.value}"]`)?.focus();
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key in STEP) {
      event.preventDefault();
      select(tabStop + STEP[event.key]);
    } else if (event.key === "Home") {
      event.preventDefault();
      select(0);
    } else if (event.key === "End") {
      event.preventDefault();
      select(segments.length - 1);
    }
  }

  return (
    <div
      ref={groupRef}
      role="radiogroup"
      aria-label={label}
      aria-disabled={disabled || undefined}
      onKeyDown={disabled ? undefined : onKeyDown}
      className={cn("inline-flex h-11 gap-0.5", className)}
    >
      {segments.map((segment, index) => {
        const selected = segment.value === value;
        return (
          <button
            key={segment.value}
            type="button"
            role="radio"
            aria-checked={selected}
            data-value={segment.value}
            tabIndex={index === tabStop ? 0 : -1}
            disabled={disabled}
            onClick={() => onValueChange(segment.value)}
            className={cn(
              "state-layer focus-ring press flex min-w-12 flex-1 cursor-pointer items-center justify-center gap-2 px-4 text-label-large",
              "disabled:cursor-default disabled:opacity-38",
              selected
                ? "rounded-full bg-secondary-container text-on-secondary-container"
                : "rounded-sm bg-surface-container-highest text-on-surface first:rounded-s-full last:rounded-e-full",
            )}
          >
            {(selected || segment.icon) && (
              <Icon name={selected ? "check" : segment.icon!} size={18} />
            )}
            <span className="truncate">{segment.label}</span>
          </button>
        );
      })}
    </div>
  );
}
