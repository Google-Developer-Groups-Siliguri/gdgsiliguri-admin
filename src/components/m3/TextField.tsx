"use client";

import {
  useId,
  useState,
  type ChangeEvent,
  type InputHTMLAttributes,
  type ReactNode,
  type Ref,
  type TextareaHTMLAttributes,
} from "react";

import { cn } from "@/lib/cn";

import { Icon } from "./Icon";

export type FieldShape = "full" | "start" | "end";

const SHAPES: Record<FieldShape, string> = {
  full: "rounded-md",
  start: "rounded-[16px_6px_6px_16px]",
  end: "rounded-[6px_16px_16px_6px]",
};

type SharedProps = {
  label: string;
  variant?: "filled" | "pill";
  labelPlacement?: "outside" | "inside";
  shape?: FieldShape;
  supportingText?: ReactNode;
  error?: string | false;
  warning?: string | false;
  leadingIcon?: string;
  trailing?: ReactNode;
  showCounter?: boolean;
  containerClassName?: string;
};

type InputProps = SharedProps &
  Omit<InputHTMLAttributes<HTMLInputElement>, "placeholder"> & {
    multiline?: false;
    ref?: Ref<HTMLInputElement>;
  };

type TextareaProps = SharedProps &
  Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "placeholder"> & {
    multiline: true;
    ref?: Ref<HTMLTextAreaElement>;
  };

export type TextFieldProps = InputProps | TextareaProps;

function initialLength(value: unknown, defaultValue: unknown): number {
  if (typeof value === "string") return value.length;
  if (typeof defaultValue === "string") return defaultValue.length;
  return 0;
}

export function TextField(props: TextFieldProps) {
  const {
    label,
    variant = "filled",
    labelPlacement = "outside",
    shape = "full",
    supportingText,
    error,
    warning,
    leadingIcon,
    trailing,
    showCounter,
    containerClassName,
    className,
    id: providedId,
    multiline,
    ...fieldProps
  } = props;
  const rest = fieldProps as InputHTMLAttributes<HTMLElement>;
  const generatedId = useId();
  const id = providedId ?? generatedId;
  const supportId = `${id}-support`;
  const [uncontrolledLength, setUncontrolledLength] = useState(() =>
    initialLength(rest.value, rest.defaultValue),
  );
  const length = typeof rest.value === "string" ? rest.value.length : uncontrolledLength;
  const hasError = Boolean(error);
  const message = error || warning || supportingText;
  const maxLength = rest.maxLength;
  const pill = variant === "pill";
  const inside = !pill && labelPlacement === "inside";
  const counter = showCounter ? (maxLength ? `${length} / ${maxLength}` : `${length} characters`) : null;

  const fieldClasses = cn(
    "w-full min-w-0 bg-transparent text-body-large font-semibold text-on-surface caret-primary outline-none",
    "placeholder:font-medium placeholder:text-on-surface-variant/80 disabled:text-on-surface/38",
    leadingIcon ? (pill ? "ps-14" : "ps-12") : pill ? "ps-6" : "ps-4",
    trailing ? "pe-12" : pill ? "pe-6" : "pe-4",
    inside ? "pt-5" : multiline ? "py-3.5" : "",
    className,
  );

  const containerClasses = cn(
    "state-layer field-fill relative flex w-full ring-inset transition-[box-shadow,border-radius] duration-medium ease-emph",
    multiline ? "items-start" : "items-center",
    pill ? "rounded-full focus-within:rounded-lg" : SHAPES[shape],
    hasError ? "ring-2 ring-error" : "focus-within:ring-2 focus-within:ring-primary",
    "has-[:disabled]:opacity-60",
  );

  const describedBy = message || (showCounter && inside) ? supportId : undefined;
  const common = {
    id,
    placeholder: pill ? label : undefined,
    "aria-label": pill ? label : undefined,
    "aria-invalid": hasError || undefined,
    "aria-describedby": describedBy,
    className: fieldClasses,
  };
  const requiredMark = rest.required && <span aria-hidden> *</span>;

  return (
    <div className={cn("flex w-full min-w-0 flex-col gap-2", containerClassName)}>
      {!pill && !inside && (
        <div className="flex items-baseline justify-between gap-3 px-1">
          <label htmlFor={id} className="text-label-large text-on-surface">
            {label}
            {requiredMark}
          </label>
          {counter && <span className="text-label-medium text-on-surface-variant tabular-nums">{counter}</span>}
        </div>
      )}
      <div className={containerClasses}>
        {leadingIcon && (
          <Icon
            name={leadingIcon}
            className={cn(
              "pointer-events-none absolute text-on-surface-variant",
              pill ? "start-5" : "start-3.5",
              multiline && "top-4",
            )}
          />
        )}
        {multiline ? (
          <textarea
            {...(fieldProps as TextareaHTMLAttributes<HTMLTextAreaElement>)}
            {...common}
            rows={(fieldProps as TextareaHTMLAttributes<HTMLTextAreaElement>).rows ?? 3}
            onChange={(event: ChangeEvent<HTMLTextAreaElement>) => {
              setUncontrolledLength(event.target.value.length);
              (fieldProps as TextareaHTMLAttributes<HTMLTextAreaElement>).onChange?.(event);
            }}
            className={cn(common.className, "min-h-14 resize-y leading-relaxed font-medium")}
          />
        ) : (
          <input
            {...(fieldProps as InputHTMLAttributes<HTMLInputElement>)}
            {...common}
            className={cn(common.className, "h-14")}
            onChange={(event: ChangeEvent<HTMLInputElement>) => {
              setUncontrolledLength(event.target.value.length);
              (fieldProps as InputHTMLAttributes<HTMLInputElement>).onChange?.(event);
            }}
          />
        )}
        {inside && (
          <label
            htmlFor={id}
            className={cn(
              "pointer-events-none absolute top-2 truncate text-label-small font-semibold tracking-[0.04em]",
              leadingIcon ? "start-12" : "start-4",
              hasError ? "text-error" : "text-on-surface-variant",
            )}
          >
            {label}
            {requiredMark}
          </label>
        )}
        {trailing && <div className="absolute end-1 flex items-center">{trailing}</div>}
      </div>
      {(message || (counter && inside)) && (
        <div
          id={supportId}
          className={cn(
            "flex items-start gap-1.5 px-4 text-body-small",
            hasError ? "font-semibold text-error" : warning ? "font-semibold text-tertiary" : "text-on-surface-variant",
          )}
        >
          {(hasError || warning) && <Icon name={hasError ? "error" : "warning"} size={16} className="mt-px" />}
          <span className="flex-1" role={hasError ? "alert" : undefined}>
            {message}
          </span>
          {counter && inside && <span className="text-on-surface-variant tabular-nums">{counter}</span>}
        </div>
      )}
    </div>
  );
}
