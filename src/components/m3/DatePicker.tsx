"use client";

import { Popover } from "radix-ui";
import { useMemo, useRef, useState, type KeyboardEvent } from "react";

import { cn } from "@/lib/cn";
import { DATE_PATTERN, isValidDate, toIsoDate } from "@/lib/datetime";

import { Button } from "./Button";
import { IconButton } from "./IconButton";
import { TextField, type FieldShape } from "./TextField";

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];
const MONTH_FORMAT = new Intl.DateTimeFormat("en", { month: "long", year: "numeric" });
const DAY_LABEL_FORMAT = new Intl.DateTimeFormat("en", { dateStyle: "full", timeZone: "UTC" });

type DatePickerProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string | false;
  supportingText?: string;
  required?: boolean;
  disabled?: boolean;
  variant?: "filled" | "pill";
  labelPlacement?: "outside" | "inside";
  shape?: FieldShape;
  name?: string;
};

type Month = { year: number; month: number };

function monthOf(value: string): Month {
  const match = DATE_PATTERN.exec(value);
  if (match) return { year: Number(match[1]), month: Number(match[2]) - 1 };
  const today = new Date();
  return { year: today.getFullYear(), month: today.getMonth() };
}

function shiftMonth({ year, month }: Month, delta: number): Month {
  const index = year * 12 + month + delta;
  return { year: Math.floor(index / 12), month: ((index % 12) + 12) % 12 };
}

function shiftDate(value: string, days: number): string {
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days));
  return toIsoDate(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

function todayIso(): string {
  const now = new Date();
  return toIsoDate(now.getFullYear(), now.getMonth(), now.getDate());
}

function CalendarGrid({
  value,
  onSelect,
}: {
  value: string;
  onSelect: (value: string) => void;
}) {
  const [visible, setVisible] = useState<Month>(() => monthOf(value));
  const [focused, setFocused] = useState(() => (isValidDate(value) ? value : todayIso()));
  const gridRef = useRef<HTMLDivElement>(null);
  const today = todayIso();

  const days = useMemo(() => {
    const first = new Date(Date.UTC(visible.year, visible.month, 1)).getUTCDay();
    const count = new Date(Date.UTC(visible.year, visible.month + 1, 0)).getUTCDate();
    return [
      ...Array.from({ length: first }, () => null),
      ...Array.from({ length: count }, (_, index) => toIsoDate(visible.year, visible.month, index + 1)),
    ];
  }, [visible]);

  function moveFocus(next: string) {
    setFocused(next);
    const nextMonth = monthOf(next);
    if (nextMonth.year !== visible.year || nextMonth.month !== visible.month) setVisible(nextMonth);
    requestAnimationFrame(() =>
      gridRef.current?.querySelector<HTMLButtonElement>(`[data-date="${next}"]`)?.focus(),
    );
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const moves: Record<string, number> = {
      ArrowLeft: -1,
      ArrowRight: 1,
      ArrowUp: -7,
      ArrowDown: 7,
    };
    if (event.key in moves) {
      event.preventDefault();
      moveFocus(shiftDate(focused, moves[event.key]));
    }
  }

  return (
    <div className="w-80 p-3">
      <div className="flex items-center justify-between ps-3">
        <span className="text-title-small text-on-surface-variant" aria-live="polite">
          {MONTH_FORMAT.format(new Date(visible.year, visible.month, 1))}
        </span>
        <div className="flex">
          <IconButton
            icon="chevron_left"
            label="Previous month"
            onClick={() => setVisible((current) => shiftMonth(current, -1))}
          />
          <IconButton
            icon="chevron_right"
            label="Next month"
            onClick={() => setVisible((current) => shiftMonth(current, 1))}
          />
        </div>
      </div>
      <div className="grid grid-cols-7 text-center text-body-small text-on-surface" aria-hidden>
        {WEEKDAYS.map((day, index) => (
          <span key={index} className="flex h-10 items-center justify-center">
            {day}
          </span>
        ))}
      </div>
      <div ref={gridRef} role="grid" className="grid grid-cols-7" onKeyDown={onKeyDown}>
        {days.map((day, index) =>
          day === null ? (
            <span key={`blank-${index}`} />
          ) : (
            <button
              key={day}
              type="button"
              data-date={day}
              tabIndex={day === focused ? 0 : -1}
              aria-label={DAY_LABEL_FORMAT.format(new Date(`${day}T00:00:00Z`))}
              aria-pressed={day === value}
              onClick={() => onSelect(day)}
              onFocus={() => setFocused(day)}
              className={cn(
                "state-layer focus-ring mx-auto flex size-10 cursor-pointer items-center justify-center rounded-full text-body-large",
                day === value
                  ? "bg-primary text-on-primary"
                  : day === today
                    ? "border border-primary text-primary"
                    : "text-on-surface",
              )}
            >
              {Number(day.slice(8))}
            </button>
          ),
        )}
      </div>
    </div>
  );
}

export function DatePicker({
  label,
  value,
  onChange,
  error,
  supportingText = "YYYY-MM-DD",
  required,
  disabled,
  variant,
  labelPlacement,
  shape,
  name,
}: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value);
  const [lastValue, setLastValue] = useState(value);
  if (value !== lastValue) {
    setLastValue(value);
    setDraft(value);
  }
  const invalidTyped = draft !== "" && !isValidDate(draft);

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Anchor asChild>
        <div className="w-full">
          <TextField
            label={label}
            name={name}
            variant={variant}
            labelPlacement={labelPlacement}
            shape={shape}
            value={draft}
            inputMode="numeric"
            required={required}
            disabled={disabled}
            error={error || (invalidTyped && "Use a real date as YYYY-MM-DD")}
            supportingText={supportingText}
            onChange={(event) => {
              const next = event.target.value;
              setDraft(next);
              if (next === "" || isValidDate(next)) onChange(next);
            }}
            trailing={
              <Popover.Trigger asChild>
                <IconButton icon="calendar_month" label={`Choose ${label}`} disabled={disabled} />
              </Popover.Trigger>
            }
          />
        </div>
      </Popover.Anchor>
      <Popover.Portal>
        <Popover.Content
          align="end"
          sideOffset={4}
          collisionPadding={8}
          className="z-50 max-h-[var(--radix-popover-content-available-height)] origin-(--radix-popover-content-transform-origin) overflow-y-auto rounded-xl bg-surface-container-high text-on-surface shadow-[0_16px_40px_-16px_rgb(0_0_0/0.5)] outline-none animate-pop-in"
        >
          <CalendarGrid
            value={isValidDate(value) ? value : ""}
            onSelect={(next) => {
              onChange(next);
              setOpen(false);
            }}
          />
          <div className="flex justify-end gap-2 px-3 pb-3">
            <Button variant="text" onClick={() => setOpen(false)}>
              Cancel
            </Button>
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
