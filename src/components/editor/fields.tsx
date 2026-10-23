"use client";

import type { ReactNode } from "react";
import { Controller, type Control, type FieldValues, type Path } from "react-hook-form";

import { DatePicker } from "@/components/m3/DatePicker";
import { ImageUrlField } from "@/components/m3/ImageUrlField";
import { SegmentedButton, type Segment } from "@/components/m3/SegmentedButton";
import { Select, type SelectOption } from "@/components/m3/Select";
import { Switch } from "@/components/m3/Switch";
import { TextField } from "@/components/m3/TextField";
import { TimePicker } from "@/components/m3/TimePicker";
import { UrlField } from "@/components/m3/UrlField";

import { UploadButton } from "./upload";

type BaseProps<T extends FieldValues> = {
  control: Control<T>;
  name: Path<T>;
  label: string;
  required?: boolean;
  warning?: string;
  supportingText?: string;
};

export function TextInput<T extends FieldValues>({
  control,
  name,
  label,
  required,
  warning,
  supportingText,
  multiline,
  rows,
  maxLength,
  autoFocus,
}: BaseProps<T> & { multiline?: boolean; rows?: number; maxLength?: number; autoFocus?: boolean }) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => {
        const shared = {
          label,
          required,
          name: field.name,
          value: (field.value as string) ?? "",
          onBlur: field.onBlur,
          error: fieldState.error?.message,
          warning,
          supportingText,
          maxLength,
          showCounter: Boolean(maxLength),
          autoFocus,
        };
        return multiline ? (
          <TextField
            {...shared}
            multiline
            rows={rows ?? 4}
            ref={field.ref}
            onChange={(event) => field.onChange(event.target.value)}
          />
        ) : (
          <TextField
            {...shared}
            ref={field.ref}
            onChange={(event) => field.onChange(event.target.value)}
          />
        );
      }}
    />
  );
}

export function UrlInput<T extends FieldValues>({
  control,
  name,
  label,
  required,
  warning,
  supportingText,
  leadingIcon,
}: BaseProps<T> & { leadingIcon?: string }) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <UrlField
          ref={field.ref}
          label={label}
          name={field.name}
          required={required}
          leadingIcon={leadingIcon}
          value={(field.value as string) ?? ""}
          onChange={field.onChange}
          onBlur={field.onBlur}
          error={fieldState.error?.message}
          warning={warning}
          supportingText={supportingText}
        />
      )}
    />
  );
}

export function ImageInput<T extends FieldValues>({
  control,
  name,
  label,
  required,
  warning,
  supportingText,
  shape,
  action,
}: BaseProps<T> & { shape?: "square" | "circle" | "wide"; action?: ReactNode }) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <ImageUrlField
          ref={field.ref}
          label={label}
          name={field.name}
          required={required}
          shape={shape}
          value={(field.value as string) ?? ""}
          onChange={field.onChange}
          onBlur={field.onBlur}
          error={fieldState.error?.message}
          warning={warning}
          supportingText={supportingText}
          action={action ?? <UploadButton label={label} onUploaded={(url) => field.onChange(url)} />}
        />
      )}
    />
  );
}

export function SelectInput<T extends FieldValues>({
  control,
  name,
  label,
  required,
  supportingText,
  options,
}: BaseProps<T> & { options: SelectOption[] }) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <Select
          label={label}
          name={field.name}
          required={required}
          options={options}
          value={(field.value as string) || undefined}
          onValueChange={field.onChange}
          error={fieldState.error?.message}
          supportingText={supportingText}
        />
      )}
    />
  );
}

export function SegmentedInput<T extends FieldValues>({
  control,
  name,
  label,
  segments,
}: Omit<BaseProps<T>, "required"> & { segments: Segment[] }) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <div className="flex flex-col gap-1">
          <span className="text-label-large text-on-surface-variant">{label}</span>
          <SegmentedButton
            label={label}
            segments={segments}
            value={field.value as string}
            onValueChange={field.onChange}
            className="w-full"
          />
          {fieldState.error && (
            <span className="px-4 text-body-small text-error">{fieldState.error.message}</span>
          )}
        </div>
      )}
    />
  );
}

export function TimeInput<T extends FieldValues>({
  control,
  name,
  label,
  required,
  warning,
}: BaseProps<T>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <TimePicker
          label={label}
          name={field.name}
          required={required}
          value={(field.value as string) ?? ""}
          onChange={field.onChange}
          error={fieldState.error?.message}
          warning={warning}
        />
      )}
    />
  );
}

export function DateInput<T extends FieldValues>({
  control,
  name,
  label,
  required,
  supportingText,
}: BaseProps<T>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <DatePicker
          label={label}
          name={field.name}
          required={required}
          value={(field.value as string) ?? ""}
          onChange={field.onChange}
          error={fieldState.error?.message}
          supportingText={supportingText}
        />
      )}
    />
  );
}

export function SwitchInput<T extends FieldValues>({
  control,
  name,
  label,
  supportingText,
}: Omit<BaseProps<T>, "required" | "warning">) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <label className="flex min-h-14 cursor-pointer items-center gap-4">
          <span className="flex flex-1 flex-col">
            <span className="text-body-large text-on-surface">{label}</span>
            {supportingText && (
              <span className="text-body-medium text-on-surface-variant">{supportingText}</span>
            )}
          </span>
          <Switch
            checked={Boolean(field.value)}
            onCheckedChange={field.onChange}
            aria-label={label}
          />
        </label>
      )}
    />
  );
}
