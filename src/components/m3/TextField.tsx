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

type SharedProps = {
  label: string;
  variant?: "filled" | "pill";
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

  const fieldClasses = cn(
    "peer w-full min-w-0 bg-transparent pt-6 pb-2 text-body-large text-on-surface caret-primary outline-none",
    "placeholder:text-transparent disabled:text-on-surface/38",
    leadingIcon ? "ps-12" : pill ? "ps-6" : "ps-4",
    trailing ? "pe-12" : pill ? "pe-6" : "pe-4",
    className,
  );

  const labelClasses = cn(
    "pointer-events-none absolute top-4 origin-[0_0] truncate text-body-large text-on-surface-variant",
    "transition-[transform,color,top] duration-medium ease-emph",
    "max-w-[calc(100%-2rem)]",
    leadingIcon ? "start-12" : pill ? "start-6" : "start-4",
    "peer-focus:top-2 peer-focus:scale-75 peer-[:not(:placeholder-shown)]:top-2 peer-[:not(:placeholder-shown)]:scale-75",
    hasError ? "text-error peer-focus:text-error" : "peer-focus:text-primary",
    "peer-disabled:text-on-surface/38",
  );

  const containerClasses = cn(
    "state-layer relative flex w-full ring-inset transition-[box-shadow,border-radius] duration-medium ease-emph",
    multiline ? "items-start" : "items-center",
    pill
      ? "rounded-full bg-surface-container-high focus-within:rounded-lg"
      : "rounded-md bg-surface-container-highest",
    hasError ? "ring-2 ring-error" : "focus-within:ring-2 focus-within:ring-primary",
    "has-[:disabled]:opacity-60",
  );

  const describedBy = message || showCounter ? supportId : undefined;
  const common = {
    id,
    placeholder: " ",
    "aria-invalid": hasError || undefined,
    "aria-describedby": describedBy,
    className: fieldClasses,
  };

  return (
    <div className={cn("flex w-full min-w-0 flex-col", containerClassName)}>
      <div className={containerClasses}>
        {leadingIcon && (
          <Icon
            name={leadingIcon}
            className="pointer-events-none absolute start-3 text-on-surface-variant"
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
            className={cn(common.className, "min-h-14 resize-y")}
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
        <label htmlFor={id} className={labelClasses}>
          {label}
          {rest.required && <span aria-hidden> *</span>}
        </label>
        {trailing && <div className="absolute end-1 flex items-center">{trailing}</div>}
      </div>
      {(message || showCounter) && (
        <div
          id={supportId}
          className={cn(
            "flex gap-4 px-4 pt-1.5 text-body-small",
            hasError ? "text-error" : warning ? "text-tertiary" : "text-on-surface-variant",
          )}
        >
          <span className="flex-1" role={hasError ? "alert" : undefined}>
            {message}
          </span>
          {showCounter && (
            <span className="text-on-surface-variant tabular-nums">
              {maxLength ? `${length}/${maxLength}` : length}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
