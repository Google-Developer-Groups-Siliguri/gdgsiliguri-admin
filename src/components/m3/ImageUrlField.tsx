"use client";

import { useState, type ReactNode, type Ref } from "react";

import { cn } from "@/lib/cn";
import { isHttpsUrl } from "@/lib/url";

import { Icon } from "./Icon";
import { UrlField } from "./UrlField";

type ImageUrlFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  error?: string | false;
  supportingText?: string;
  required?: boolean;
  disabled?: boolean;
  name?: string;
  shape?: "square" | "circle" | "wide";
  action?: ReactNode;
  ref?: Ref<HTMLInputElement>;
};

type LoadState = { url: string; status: "loading" | "loaded" | "broken" };

export function ImageUrlField({
  label,
  value,
  onChange,
  onBlur,
  error,
  supportingText,
  required,
  disabled,
  name,
  shape = "square",
  action,
  ref,
}: ImageUrlFieldProps) {
  const [load, setLoad] = useState<LoadState>({ url: "", status: "loading" });
  const previewable = isHttpsUrl(value.trim());
  const status = load.url === value ? load.status : "loading";
  const broken = previewable && status === "broken";

  return (
    <div className="flex w-full items-start gap-3">
      <div
        className={cn(
          "flex shrink-0 items-center justify-center overflow-hidden",
          broken
            ? "bg-error-container text-on-error-container"
            : "bg-surface-container-highest text-on-surface-variant",
          shape === "circle" && "size-14 rounded-full",
          shape === "square" && "size-14 rounded-sm",
          shape === "wide" && "h-14 w-24 rounded-sm",
        )}
      >
        {previewable && !broken ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={value}
            src={value.trim()}
            alt=""
            className={cn("size-full object-cover", status === "loading" && "opacity-0")}
            ref={(img) => {
              if (img?.complete && load.url !== value) {
                setLoad({ url: value, status: img.naturalWidth > 0 ? "loaded" : "broken" });
              }
            }}
            onLoad={() => setLoad({ url: value, status: "loaded" })}
            onError={() => setLoad({ url: value, status: "broken" })}
          />
        ) : (
          <Icon name={broken ? "broken_image" : "image"} />
        )}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <UrlField
          ref={ref}
          label={label}
          name={name}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          required={required}
          disabled={disabled}
          leadingIcon="image"
          error={error || (broken && "This image could not be loaded")}
          supportingText={supportingText}
        />
        {action}
      </div>
    </div>
  );
}
