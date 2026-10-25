"use client";

import { useRef, useState, type DragEvent } from "react";
import { Controller, type Control, type FieldValues, type Path } from "react-hook-form";

import { IconButton } from "@/components/m3/IconButton";
import { Icon } from "@/components/m3/Icon";
import { LinearProgress } from "@/components/m3/Progress";
import { LoadingIndicator } from "@/components/m3/LoadingIndicator";
import { UrlField } from "@/components/m3/UrlField";
import { cn } from "@/lib/cn";
import { ALLOWED_IMAGE_TYPES } from "@/lib/uploads/folders";
import { isHttpsUrl } from "@/lib/url";

import { useImageUpload } from "./upload";

type ImageSlotProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  size?: string;
  aspect?: string;
  fit?: "cover" | "contain";
  hint?: string;
  warning?: string | false;
  error?: string;
  className?: string;
};

function fileName(url: string): string {
  const path = url.split("?")[0].split("/").pop() ?? "";
  try {
    return decodeURIComponent(path);
  } catch {
    return path;
  }
}

export function ImageSlot({
  label,
  value,
  onChange,
  size,
  aspect = "16 / 9",
  fit = "contain",
  hint,
  warning,
  error,
  className,
}: ImageSlotProps) {
  const { available, uploading, upload } = useImageUpload();
  const input = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [editing, setEditing] = useState(false);
  const [broken, setBroken] = useState<string | null>(null);
  const url = value.trim();
  const hasImage = isHttpsUrl(url) && broken !== url;
  const showLink = editing || !available || Boolean(error) || Boolean(warning) || (url !== "" && !isHttpsUrl(url));

  function accept(file: File | undefined) {
    if (file) void upload(file).then((uploaded) => uploaded && onChange(uploaded));
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    if (available) accept(event.dataTransfer.files[0]);
  }

  return (
    <div
      className={cn("flex flex-col gap-3.5 rounded-[28px] bg-(--list-fill,var(--md-sys-color-surface-container)) p-3.5", className)}
      onDragOver={(event) => {
        if (!available) return;
        event.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
    >
      <input
        ref={input}
        type="file"
        accept={ALLOWED_IMAGE_TYPES.join(",")}
        className="sr-only"
        tabIndex={-1}
        aria-label={`Upload ${label}`}
        onChange={(event) => {
          accept(event.target.files?.[0]);
          event.target.value = "";
        }}
      />
      <div className="relative overflow-hidden rounded-[18px]" style={{ aspectRatio: aspect }}>
        {hasImage ? (
          <div className="absolute inset-0 bg-white">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              key={url}
              src={url}
              alt={label}
              className={cn("size-full", fit === "cover" ? "object-cover" : "object-contain")}
              onError={() => setBroken(url)}
            />
          </div>
        ) : (
          <button
            type="button"
            disabled={!available || uploading}
            onClick={() => input.current?.click()}
            className={cn(
              "focus-ring absolute inset-0 flex min-h-30 flex-col items-center justify-center gap-2 rounded-[18px] border-2 border-dashed text-on-surface-variant transition-[background-color,border-color] duration-300",
              broken === url && url
                ? "border-error bg-error-container/40 text-on-error-container"
                : "border-outline enabled:cursor-pointer enabled:hover:border-primary enabled:hover:bg-surface-container-high",
            )}
          >
            <span className="shape-cookie6 grid size-11 place-items-center bg-surface-container-highest">
              <Icon name={broken === url && url ? "broken_image" : "upload"} size={20} />
            </span>
            <span className="text-label-large text-on-surface">
              {broken === url && url ? "This image could not be loaded" : available ? "Drop image or browse" : "Paste an image link"}
            </span>
            {size && <span className="text-label-medium">{size} · PNG, JPG or WebP</span>}
          </button>
        )}
        {hasImage && size && (
          <span className="absolute start-2.5 top-2.5 rounded-full bg-black/60 px-2.5 py-1 text-label-small font-bold text-white">
            {size}
          </span>
        )}
        {(dragging || uploading) && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-primary-container/90 px-6 text-on-primary-container">
            {uploading ? <LoadingIndicator label={`Uploading ${label}`} size={44} /> : <Icon name="file_upload" size={32} />}
            <span className="text-label-large">{uploading ? "Uploading…" : "Drop to upload"}</span>
            {uploading && <LinearProgress label={`Uploading ${label}`} className="max-w-56" />}
          </div>
        )}
      </div>
      <div className="flex items-center gap-2 px-1.5">
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="text-label-large text-on-surface">{label}</span>
          <span className="truncate text-body-small text-on-surface-variant">
            {[hint, hasImage ? fileName(url) : "Not set"].filter(Boolean).join(" · ")}
          </span>
        </div>
        {available && (
          <IconButton icon="upload" label={`Upload ${label} image`} variant="tonal" disabled={uploading} onClick={() => input.current?.click()} />
        )}
        <IconButton
          icon="link"
          label={`Edit ${label} link`}
          variant="tonal"
          selected={showLink && available ? true : undefined}
          onClick={() => setEditing((current) => !current)}
        />
        {url && (
          <IconButton icon="delete" label={`Remove ${label}`} variant="tonal" onClick={() => onChange("")} />
        )}
      </div>
      {showLink && (
        <UrlField label={`${label} link`} value={value} onChange={onChange} leadingIcon="image" error={error} warning={warning} />
      )}
    </div>
  );
}

type ImageSlotInputProps<T extends FieldValues> = Omit<ImageSlotProps, "value" | "onChange" | "error"> & {
  control: Control<T>;
  name: Path<T>;
};

export function ImageSlotInput<T extends FieldValues>({ control, name, ...props }: ImageSlotInputProps<T>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <ImageSlot {...props} value={(field.value as string) ?? ""} onChange={field.onChange} error={fieldState.error?.message} />
      )}
    />
  );
}
