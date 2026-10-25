"use client";

import { useState } from "react";

import { Icon } from "@/components/m3/Icon";
import { cn } from "@/lib/cn";
import { isHttpsUrl } from "@/lib/url";

type ItemThumbnailProps = { src: string; round?: boolean; shape?: string; tint?: string };

export function ItemThumbnail({ src, round = false, shape, tint }: ItemThumbnailProps) {
  const [broken, setBroken] = useState<string | null>(null);
  const usable = isHttpsUrl(src.trim()) && broken !== src;
  return (
    <span
      className={cn(
        "flex size-13 shrink-0 items-center justify-center overflow-hidden bg-surface-container-highest text-on-surface-variant",
        !shape && (round ? "rounded-full" : "rounded-md"),
      )}
      style={shape ? { clipPath: `var(--s-${shape})`, background: tint } : undefined}
    >
      {usable ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src.trim()}
          alt=""
          loading="lazy"
          className="size-full object-cover"
          onError={() => setBroken(src)}
        />
      ) : (
        <Icon name={src ? "broken_image" : "image"} size={20} />
      )}
    </span>
  );
}
