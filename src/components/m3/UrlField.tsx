"use client";

import type { Ref } from "react";

import { isHttpsUrl, suggestUrlFix } from "@/lib/url";

import { Button } from "./Button";
import { TextField } from "./TextField";

export type UrlFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  error?: string | false;
  warning?: string | false;
  supportingText?: string;
  required?: boolean;
  disabled?: boolean;
  variant?: "filled" | "outlined";
  name?: string;
  leadingIcon?: string;
  ref?: Ref<HTMLInputElement>;
};

export function urlProblem(value: string, required?: boolean): string | null {
  if (value === "") return required ? "Required" : null;
  if (value !== value.trim()) return "Has spaces at the start or end";
  if (!isHttpsUrl(value)) return "Must be a full https:// link";
  return null;
}

export function UrlField({
  label,
  value,
  onChange,
  onBlur,
  error,
  warning,
  supportingText,
  required,
  disabled,
  variant,
  name,
  leadingIcon = "link",
  ref,
}: UrlFieldProps) {
  const fix = suggestUrlFix(value);
  return (
    <div className="flex w-full flex-col gap-1">
      <TextField
        ref={ref}
        label={label}
        name={name}
        type="url"
        inputMode="url"
        variant={variant}
        value={value}
        required={required}
        disabled={disabled}
        leadingIcon={leadingIcon}
        error={error}
        warning={warning}
        supportingText={supportingText}
        onChange={(event) => onChange(event.target.value)}
        onBlur={onBlur}
      />
      {fix && !disabled && (
        <div className="flex items-center gap-2 px-4">
          <span className="min-w-0 flex-1 truncate text-body-small text-on-surface-variant">
            Did you mean <span className="text-on-surface">{fix}</span>?
          </span>
          <Button variant="text" icon="auto_fix_high" onClick={() => onChange(fix)}>
            Fix it
          </Button>
        </div>
      )}
    </div>
  );
}
