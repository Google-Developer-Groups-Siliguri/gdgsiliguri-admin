"use client";

import { Popover } from "radix-ui";
import { useState } from "react";

import { cn } from "@/lib/cn";
import { formatTime12, parseTime12, type Time12 } from "@/lib/datetime";

import { Button } from "./Button";
import { IconButton } from "./IconButton";
import { TextField } from "./TextField";

type TimePickerProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string | false;
  warning?: string | false;
  supportingText?: string;
  required?: boolean;
  disabled?: boolean;
  variant?: "filled" | "outlined";
  name?: string;
};

const DEFAULT_TIME: Time12 = { hour: 9, minute: 0, period: "AM" };

function clampNumber(raw: string, min: number, max: number): number | null {
  if (!/^\d{1,2}$/.test(raw)) return null;
  const value = Number(raw);
  return value >= min && value <= max ? value : null;
}

function TimeInputs({
  initial,
  onConfirm,
  onCancel,
}: {
  initial: Time12;
  onConfirm: (value: string) => void;
  onCancel: () => void;
}) {
  const [hour, setHour] = useState(String(initial.hour).padStart(2, "0"));
  const [minute, setMinute] = useState(String(initial.minute).padStart(2, "0"));
  const [period, setPeriod] = useState(initial.period);
  const parsedHour = clampNumber(hour, 1, 12);
  const parsedMinute = clampNumber(minute, 0, 59);
  const valid = parsedHour !== null && parsedMinute !== null;

  const segment =
    "h-18 w-24 rounded-sm bg-surface-container-highest text-center text-display-medium text-on-surface outline-none focus:bg-primary-container focus:text-on-primary-container focus:ring-2 focus:ring-primary";

  return (
    <div className="flex flex-col gap-5 p-6">
      <span className="text-label-medium text-on-surface-variant">Enter time</span>
      <div className="flex items-start gap-3">
        <label className="flex flex-col gap-1.5">
          <input
            aria-label="Hour"
            inputMode="numeric"
            maxLength={2}
            value={hour}
            onChange={(event) => setHour(event.target.value.replace(/\D/g, ""))}
            onFocus={(event) => event.target.select()}
            className={cn(segment, parsedHour === null && "ring-2 ring-error")}
          />
          <span className="text-body-small text-on-surface-variant">Hour</span>
        </label>
        <span className="flex h-18 items-center text-display-large text-on-surface">:</span>
        <label className="flex flex-col gap-1.5">
          <input
            aria-label="Minute"
            inputMode="numeric"
            maxLength={2}
            value={minute}
            onChange={(event) => setMinute(event.target.value.replace(/\D/g, ""))}
            onFocus={(event) => event.target.select()}
            className={cn(segment, parsedMinute === null && "ring-2 ring-error")}
          />
          <span className="text-body-small text-on-surface-variant">Minute</span>
        </label>
        <div
          role="radiogroup"
          aria-label="AM or PM"
          className="ms-1 flex h-18 w-13 flex-col overflow-hidden rounded-sm border border-outline"
        >
          {(["AM", "PM"] as const).map((option) => (
            <button
              key={option}
              type="button"
              role="radio"
              aria-checked={period === option}
              onClick={() => setPeriod(option)}
              className={cn(
                "state-layer focus-ring flex-1 cursor-pointer text-title-medium not-first:border-t not-first:border-outline",
                period === option
                  ? "bg-tertiary-container text-on-tertiary-container"
                  : "text-on-surface-variant",
              )}
            >
              {option}
            </button>
          ))}
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="text" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          variant="text"
          disabled={!valid}
          onClick={() =>
            valid && onConfirm(formatTime12({ hour: parsedHour, minute: parsedMinute, period }))
          }
        >
          OK
        </Button>
      </div>
    </div>
  );
}

export function TimePicker({
  label,
  value,
  onChange,
  error,
  warning,
  supportingText = "hh:mm AM/PM",
  required,
  disabled,
  variant,
  name,
}: TimePickerProps) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value);
  const [lastValue, setLastValue] = useState(value);
  if (value !== lastValue) {
    setLastValue(value);
    setDraft(value);
  }
  const invalidTyped = draft !== "" && parseTime12(draft) === null;

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Anchor asChild>
        <div className="w-full">
          <TextField
            label={label}
            name={name}
            variant={variant}
            value={draft}
            required={required}
            disabled={disabled}
            error={error || (invalidTyped && "Use hh:mm AM or hh:mm PM, for example 08:00 AM")}
            warning={warning}
            supportingText={supportingText}
            onChange={(event) => {
              const next = event.target.value.toUpperCase();
              setDraft(next);
              if (next === "" || parseTime12(next)) onChange(next);
            }}
            trailing={
              <Popover.Trigger asChild>
                <IconButton icon="schedule" label={`Choose ${label}`} disabled={disabled} />
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
          className="z-50 max-h-[var(--radix-popover-content-available-height)] overflow-y-auto rounded-xl bg-surface-container-high text-on-surface elevation-3 outline-none animate-fade-in"
        >
          <TimeInputs
            initial={parseTime12(value) ?? DEFAULT_TIME}
            onCancel={() => setOpen(false)}
            onConfirm={(next) => {
              onChange(next);
              setOpen(false);
            }}
          />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
