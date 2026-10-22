"use client";

import { useState } from "react";

import { Icon } from "@/components/m3/Icon";
import { cn } from "@/lib/cn";
import { isHttpsUrl } from "@/lib/url";

export function ItemThumbnail({ src, round = false }: { src: string; round?: boolean }) {
  const [broken, setBroken] = useState<string | null>(null);
  const usable = isHttpsUrl(src.trim()) && broken !== src;
  return (
    <span
      className={cn(
        "flex size-10 shrink-0 items-center justify-center overflow-hidden bg-surface-container-highest text-on-surface-variant",
        round ? "rounded-full" : "rounded-sm",
      )}
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
