"use client";

import { Checkbox as RadixCheckbox } from "radix-ui";
import { useId, type ComponentProps } from "react";

import { cn } from "@/lib/cn";

import { Icon } from "./Icon";

export type CheckboxProps = ComponentProps<typeof RadixCheckbox.Root> & {
  label?: string;
  error?: boolean;
};

export function Checkbox({ label, error, className, id: providedId, ...props }: CheckboxProps) {
  const generatedId = useId();
  const id = providedId ?? generatedId;
  const box = (
    <RadixCheckbox.Root
      id={id}
      aria-invalid={error || undefined}
      className={cn(
        "group focus-ring relative inline-flex size-[18px] shrink-0 cursor-pointer items-center justify-center rounded-[2px] border-2",
        "transition-colors duration-short ease-standard disabled:cursor-default disabled:opacity-38",
        error
          ? "border-error data-[state=checked]:bg-error data-[state=indeterminate]:bg-error"
          : "border-on-surface-variant data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=indeterminate]:border-primary data-[state=indeterminate]:bg-primary",
        "before:absolute before:-inset-[11px] before:rounded-full before:bg-on-surface before:opacity-0 before:transition-opacity hover:before:opacity-8 focus-visible:before:opacity-10",
        className,
      )}
      {...props}
    >
      <RadixCheckbox.Indicator className="flex text-on-primary">
        <Icon
          name={props.checked === "indeterminate" ? "remove" : "check"}
          size={18}
          className="[font-variation-settings:'wght'_700]"
        />
      </RadixCheckbox.Indicator>
    </RadixCheckbox.Root>
  );
  if (!label) return box;
  return (
    <div className="inline-flex min-h-12 items-center gap-4">
      <span className="flex size-10 items-center justify-center">{box}</span>
      <label htmlFor={id} className="cursor-pointer text-body-large text-on-surface">
        {label}
      </label>
    </div>
  );
}
