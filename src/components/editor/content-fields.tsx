"use client";

import { useState, type ReactNode } from "react";
import { Controller, type Control, type FieldValues, type Path } from "react-hook-form";

import { Button } from "@/components/m3/Button";
import { FilterChip, InputChip } from "@/components/m3/Chip";
import { DatePicker } from "@/components/m3/DatePicker";
import { ImageUrlField } from "@/components/m3/ImageUrlField";
import { Select } from "@/components/m3/Select";
import { TextField } from "@/components/m3/TextField";
import { TimePicker } from "@/components/m3/TimePicker";
import { UrlField } from "@/components/m3/UrlField";
import type { LinkKey } from "@/lib/schema/v2";
import { DEFAULT_TIME_ZONE, formatLegacyDate, formatLegacyTime, isoInZone, time12To24 } from "@/lib/time/tz";

import { ImageSlot } from "./ImageSlot";
import { UploadButton, type UploadedImage } from "./upload";

type Media = { url: string; alt: string; width?: number; height?: number };

type BaseProps<T extends FieldValues> = {
  control: Control<T>;
  name: Path<T>;
  label: string;
  required?: boolean;
  warning?: string;
  supportingText?: string;
};

function asMedia(value: unknown): Media {
  const media = (value ?? {}) as Partial<Media>;
  return { url: media.url ?? "", alt: media.alt ?? "", width: media.width, height: media.height };
}

function withUrl(media: Media, url: string): Media {
  return url === media.url ? media : { url, alt: media.alt };
}

function fromUpload(media: Media, image: UploadedImage): Media {
  return { url: image.url, alt: media.alt, width: image.width, height: image.height };
}

export function MediaInput<T extends FieldValues>({
  control,
  name,
  label,
  required,
  warning,
  supportingText,
  shape,
  altLabel = "Image description",
  optional = false,
}: BaseProps<T> & { shape?: "square" | "circle" | "wide"; altLabel?: string; optional?: boolean }) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => {
        const media = asMedia(field.value);
        const set = (next: Media) => field.onChange(optional && next.url === "" ? undefined : next);
        const urlError = (fieldState.error as { url?: { message?: string } } | undefined)?.url?.message;
        const altError = (fieldState.error as { alt?: { message?: string } } | undefined)?.alt?.message;
        return (
          <div className="flex flex-col gap-2">
            <ImageUrlField
              ref={field.ref}
              label={label}
              name={field.name}
              required={required}
              shape={shape}
              value={media.url}
              onChange={(url) => set(withUrl(media, url))}
              onBlur={field.onBlur}
              error={urlError ?? (fieldState.error && !altError ? fieldState.error.message : undefined)}
              warning={warning}
              supportingText={supportingText}
              action={<UploadButton label={label} onUploaded={(image) => set(fromUpload(media, image))} />}
            />
            {media.url !== "" && (
              <div className="ps-17">
                <TextField
                  label={altLabel}
                  labelPlacement="inside"
                  value={media.alt}
                  error={altError}
                  supportingText={media.width ? `${media.width} × ${media.height} px` : "Read aloud by screen readers"}
                  onChange={(event) => set({ ...media, alt: event.target.value })}
                />
              </div>
            )}
          </div>
        );
      }}
    />
  );
}

export function MediaSlotInput<T extends FieldValues>({
  control,
  name,
  label,
  size,
  aspect,
  fit,
  hint,
  className,
  optional = false,
}: Omit<BaseProps<T>, "required" | "warning" | "supportingText"> & {
  size?: string;
  aspect?: string;
  fit?: "cover" | "contain";
  hint?: string;
  className?: string;
  optional?: boolean;
}) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => {
        const media = asMedia(field.value);
        const set = (next: Media) => field.onChange(optional && next.url === "" ? undefined : next);
        return (
          <div className={className}>
            <ImageSlot
              label={label}
              value={media.url}
              size={size}
              aspect={aspect}
              fit={fit}
              hint={hint}
              error={fieldState.error?.message}
              onChange={(url) => set(withUrl(media, url))}
              onUpload={(image) => set(fromUpload(media, image))}
            />
          </div>
        );
      }}
    />
  );
}

export function splitInstant(iso: string | undefined, timeZone: string): { date: string; time: string } {
  if (!iso || Number.isNaN(Date.parse(iso))) return { date: "", time: "" };
  return { date: formatLegacyDate(iso, timeZone), time: formatLegacyTime(iso, timeZone) };
}

export function joinInstant(date: string, time12: string, timeZone: string): string | null {
  if (!date || !time12) return null;
  try {
    return isoInZone(date, time12To24(time12), timeZone);
  } catch {
    return null;
  }
}

export function InstantInput<T extends FieldValues>({
  control,
  name,
  label,
  required,
  supportingText,
  timeZone = DEFAULT_TIME_ZONE,
  defaultTime = "09:00 AM",
  summary,
  optional = false,
}: BaseProps<T> & { timeZone?: string; defaultTime?: string; summary?: ReactNode; optional?: boolean }) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => {
        const { date, time } = splitInstant(field.value as string | undefined, timeZone);
        const update = (nextDate: string, nextTime: string) => {
          const iso = joinInstant(nextDate, nextTime, timeZone);
          if (iso) field.onChange(iso);
        };
        return (
          <fieldset className="flex flex-col gap-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2 px-1">
              <legend className="contents text-label-large text-on-surface">
                {label}
                {required ? " *" : ""}
              </legend>
              {summary}
            </div>
            <div className="flex flex-col gap-1 compact:flex-row">
              <div className="compact:flex-[1.4]">
                <DatePicker
                  label="Date"
                  labelPlacement="inside"
                  shape="start"
                  value={date}
                  onChange={(next) => update(next, time || defaultTime)}
                  error={fieldState.error?.message}
                  supportingText=""
                />
              </div>
              <div className="compact:flex-1">
                <TimePicker
                  label="Time"
                  labelPlacement="inside"
                  shape="end"
                  value={time}
                  onChange={(next) => update(date, next)}
                  supportingText=""
                />
              </div>
            </div>
            {(supportingText || optional) && (
              <div className="flex items-center justify-between gap-2 px-4">
                <p className="text-body-small text-on-surface-variant">{supportingText}</p>
                {optional && field.value && (
                  <Button variant="text" onClick={() => field.onChange(undefined)}>
                    Clear
                  </Button>
                )}
              </div>
            )}
          </fieldset>
        );
      }}
    />
  );
}

export function ClockInput<T extends FieldValues>({
  control,
  name,
  label,
  required,
  warning,
  date,
  timeZone = DEFAULT_TIME_ZONE,
}: BaseProps<T> & { date: string; timeZone?: string }) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <TimePicker
          label={label}
          name={field.name}
          required={required}
          value={splitInstant(field.value as string | undefined, timeZone).time}
          onChange={(next) => {
            const iso = joinInstant(date, next, timeZone);
            if (iso) field.onChange(iso);
          }}
          error={fieldState.error?.message}
          warning={warning}
        />
      )}
    />
  );
}

export function TagsInput<T extends FieldValues>({
  control,
  name,
  label,
  supportingText,
  optional = true,
}: Omit<BaseProps<T>, "required" | "warning"> & { optional?: boolean }) {
  const [text, setText] = useState("");
  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => {
        const tags = (field.value as string[] | undefined) ?? [];
        const set = (next: string[]) => field.onChange(optional && next.length === 0 ? undefined : next);
        const add = () => {
          const value = text.trim();
          if (value && !tags.includes(value)) set([...tags, value]);
          setText("");
        };
        return (
          <div className="flex flex-col gap-2">
            <TextField
              label={label}
              value={text}
              supportingText={supportingText ?? "Press Enter to add"}
              onChange={(event) => setText(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === ",") {
                  event.preventDefault();
                  add();
                }
              }}
              onBlur={add}
            />
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2" aria-label={label}>
                {tags.map((tag) => (
                  <InputChip key={tag} onRemove={() => set(tags.filter((other) => other !== tag))}>
                    {tag}
                  </InputChip>
                ))}
              </div>
            )}
          </div>
        );
      }}
    />
  );
}

const LINK_LABELS: Record<LinkKey, { label: string; icon: string }> = {
  website: { label: "Website", icon: "language" },
  github: { label: "GitHub", icon: "code" },
  linkedin: { label: "LinkedIn", icon: "work" },
  x: { label: "X / Twitter", icon: "alternate_email" },
  instagram: { label: "Instagram", icon: "photo_camera" },
  facebook: { label: "Facebook", icon: "groups" },
  youtube: { label: "YouTube", icon: "smart_display" },
  medium: { label: "Medium", icon: "article" },
};

export function LinksInput<T extends FieldValues>({
  control,
  name,
  keys,
  optional = true,
}: {
  control: Control<T>;
  name: Path<T>;
  keys: LinkKey[];
  optional?: boolean;
}) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => {
        const links = (field.value ?? {}) as Partial<Record<LinkKey, string>>;
        const errors = (fieldState.error ?? {}) as Partial<Record<LinkKey, { message?: string }>>;
        const set = (key: LinkKey, value: string) => {
          const next = { ...links, [key]: value || undefined };
          const empty = Object.values(next).every((entry) => !entry);
          field.onChange(optional && empty ? undefined : next);
        };
        return (
          <div className="flex flex-col gap-4">
            {keys.map((key) => (
              <UrlField
                key={key}
                label={LINK_LABELS[key].label}
                leadingIcon={LINK_LABELS[key].icon}
                value={links[key] ?? ""}
                onChange={(value) => set(key, value)}
                error={errors[key]?.message}
              />
            ))}
          </div>
        );
      }}
    />
  );
}

export function MarkdownInput<T extends FieldValues>({
  control,
  name,
  label,
  required,
  warning,
  rows = 6,
}: BaseProps<T> & { rows?: number }) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <TextField
          label={label}
          required={required}
          multiline
          rows={rows}
          ref={field.ref}
          name={field.name}
          value={(field.value as string) ?? ""}
          onChange={(event) => field.onChange(event.target.value)}
          onBlur={field.onBlur}
          error={fieldState.error?.message}
          warning={warning}
          supportingText="Markdown: **bold**, _italic_, [link](https://…), lists with -"
          showCounter
          maxLength={5000}
        />
      )}
    />
  );
}

export type ChoiceOption = { value: string | number; label: string };

export function ChoiceChipsInput<T extends FieldValues>({
  control,
  name,
  label,
  options,
  supportingText,
  optional = false,
}: Omit<BaseProps<T>, "required" | "warning"> & { options: ChoiceOption[]; optional?: boolean }) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => {
        const selected = (field.value as (string | number)[] | undefined) ?? [];
        const toggle = (value: string | number) => {
          const next = selected.includes(value) ? selected.filter((entry) => entry !== value) : [...selected, value];
          field.onChange(optional && next.length === 0 ? undefined : next);
        };
        return (
          <fieldset className="flex flex-col gap-2">
            <legend className="px-1 pb-1 text-label-large text-on-surface">{label}</legend>
            <div className="flex flex-wrap gap-2" role="group" aria-label={label}>
              {options.map((option) => (
                <FilterChip
                  key={option.value}
                  selected={selected.includes(option.value)}
                  onSelectedChange={() => toggle(option.value)}
                >
                  {option.label}
                </FilterChip>
              ))}
              {options.length === 0 && (
                <span className="px-1 text-body-small text-on-surface-variant">Nothing to choose yet.</span>
              )}
            </div>
            {(fieldState.error?.message || supportingText) && (
              <p
                className={
                  fieldState.error ? "px-1 text-body-small text-error" : "px-1 text-body-small text-on-surface-variant"
                }
              >
                {fieldState.error?.message ?? supportingText}
              </p>
            )}
          </fieldset>
        );
      }}
    />
  );
}

const NO_EDITION = "none";

export function EditionSelectInput<T extends FieldValues>({
  control,
  name,
  label,
  years,
  noneLabel = "Not a DevFest",
}: Omit<BaseProps<T>, "required" | "warning"> & { years: number[]; noneLabel?: string }) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => {
        const current = field.value as number | undefined;
        const options = [...new Set([...years, ...(current ? [current] : [])])].sort((a, b) => b - a);
        return (
          <Select
            label={label}
            name={field.name}
            value={current ? String(current) : NO_EDITION}
            options={[
              { value: NO_EDITION, label: noneLabel },
              ...options.map((year) => ({ value: String(year), label: `DevFest ${year}` })),
            ]}
            onValueChange={(value) => field.onChange(value === NO_EDITION ? undefined : Number(value))}
          />
        );
      }}
    />
  );
}

const NONE = "__none";

export function OptionalSelectInput<T extends FieldValues>({
  control,
  name,
  label,
  options,
  noneLabel,
  supportingText,
}: Omit<BaseProps<T>, "required" | "warning"> & { options: { value: string; label: string }[]; noneLabel: string }) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <Select
          label={label}
          name={field.name}
          value={(field.value as string | undefined) || NONE}
          options={[{ value: NONE, label: noneLabel }, ...options]}
          onValueChange={(value) => field.onChange(value === NONE ? undefined : value)}
          error={fieldState.error?.message}
          supportingText={supportingText}
        />
      )}
    />
  );
}

export function embedSrc(value: string): string {
  const match = /<iframe[^>]*\ssrc=["']([^"']+)["']/i.exec(value);
  return (match ? match[1] : value).trim();
}

export function EmbedUrlInput<T extends FieldValues>({ control, name, label, supportingText }: Omit<BaseProps<T>, "required">) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <UrlField
          ref={field.ref}
          label={label}
          name={field.name}
          leadingIcon="map"
          value={(field.value as string) ?? ""}
          onChange={(value) => field.onChange(embedSrc(value))}
          onBlur={field.onBlur}
          error={fieldState.error?.message}
          supportingText={supportingText}
        />
      )}
    />
  );
}

export function ColorInput<T extends FieldValues>({ control, name, label, required }: Omit<BaseProps<T>, "warning">) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <div className="flex items-start gap-3">
          <input
            type="color"
            aria-label={`${label} picker`}
            value={/^#[0-9a-f]{6}$/i.test(field.value ?? "") ? field.value : "#4285F4"}
            onChange={(event) => field.onChange(event.target.value.toUpperCase())}
            className="mt-1 size-12 shrink-0 cursor-pointer rounded-full border-0 bg-transparent p-0"
          />
          <TextField
            label={label}
            required={required}
            name={field.name}
            value={(field.value as string) ?? ""}
            onChange={(event) => field.onChange(event.target.value)}
            error={fieldState.error?.message}
            supportingText="For example #4285F4"
          />
        </div>
      )}
    />
  );
}
