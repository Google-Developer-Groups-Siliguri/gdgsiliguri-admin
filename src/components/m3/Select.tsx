"use client";

import { Select as RadixSelect } from "radix-ui";
import { useId } from "react";

import { cn } from "@/lib/cn";

import { Icon } from "./Icon";

export type SelectOption = { value: string; label: string; icon?: string };

export type SelectProps = {
  label: string;
  options: SelectOption[];
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  variant?: "filled" | "pill";
  supportingText?: string;
  error?: string | false;
  disabled?: boolean;
  required?: boolean;
  name?: string;
  className?: string;
};

export function Select({
  label,
  options,
  value,
  defaultValue,
  onValueChange,
  variant = "filled",
  supportingText,
  error,
  disabled,
  required,
  name,
  className,
}: SelectProps) {
  const id = useId();
  const pill = variant === "pill";
  const message = error || supportingText;
  return (
    <div className={cn("flex w-full flex-col", className)}>
      <RadixSelect.Root
        value={value}
        defaultValue={defaultValue}
        onValueChange={onValueChange}
        disabled={disabled}
        required={required}
        name={name}
      >
        <RadixSelect.Trigger
          id={id}
          aria-labelledby={`${id}-label`}
          aria-invalid={Boolean(error) || undefined}
          aria-describedby={message ? `${id}-support` : undefined}
          className={cn(
            "group state-layer relative flex h-14 w-full cursor-pointer items-center pt-5 pe-3 text-start outline-none ring-inset",
            "transition-[box-shadow,border-radius] duration-medium ease-emph disabled:cursor-default disabled:opacity-60",
            pill
              ? "rounded-full bg-surface-container-high ps-6 data-[state=open]:rounded-lg"
              : "rounded-md bg-surface-container-highest ps-4",
            error
              ? "ring-2 ring-error"
              : "focus-visible:ring-2 focus-visible:ring-primary data-[state=open]:ring-2 data-[state=open]:ring-primary",
          )}
        >
          <span
            id={`${id}-label`}
            className={cn(
              "pointer-events-none absolute top-2 text-body-small",
              pill ? "start-6" : "start-4",
              error ? "text-error" : "text-on-surface-variant group-data-[state=open]:text-primary",
            )}
          >
            {label}
            {required && <span aria-hidden> *</span>}
          </span>
          <span className="min-w-0 flex-1 truncate text-body-large text-on-surface">
            <RadixSelect.Value placeholder=" " />
          </span>
          <Icon
            name="arrow_drop_down"
            className="text-on-surface-variant transition-transform duration-short group-data-[state=open]:rotate-180"
          />
        </RadixSelect.Trigger>
        <RadixSelect.Portal>
          <RadixSelect.Content
            position="popper"
            sideOffset={6}
            className="z-50 max-h-[var(--radix-select-content-available-height)] min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-lg bg-surface-container-high shadow-[0_16px_40px_-16px_rgb(0_0_0/0.5)] animate-scale-in"
          >
            <RadixSelect.Viewport className="flex flex-col gap-0.5 p-2">
              {options.map((option) => (
                <RadixSelect.Item
                  key={option.value}
                  value={option.value}
                  className={cn(
                    "state-layer flex h-12 cursor-pointer items-center gap-3 rounded-md px-3 text-label-large text-on-surface outline-none select-none",
                    "data-[highlighted]:before:opacity-8 data-[state=checked]:bg-secondary-container data-[state=checked]:text-on-secondary-container",
                  )}
                >
                  {option.icon && <Icon name={option.icon} className="text-on-surface-variant" />}
                  <RadixSelect.ItemText>{option.label}</RadixSelect.ItemText>
                </RadixSelect.Item>
              ))}
            </RadixSelect.Viewport>
          </RadixSelect.Content>
        </RadixSelect.Portal>
      </RadixSelect.Root>
      {message && (
        <span
          id={`${id}-support`}
          className={cn("px-4 pt-1 text-body-small", error ? "text-error" : "text-on-surface-variant")}
        >
          {message}
        </span>
      )}
    </div>
  );
}
