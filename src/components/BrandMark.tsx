import Image from "next/image";

import { cn } from "@/lib/cn";

type BrandMarkProps = { className?: string; withText?: boolean; size?: number };

export function BrandMark({ className, withText = true, size = 40 }: BrandMarkProps) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <span
        className="shape-cookie9 grid shrink-0 place-items-center bg-white transition-[scale] duration-[600ms] ease-spring hover:scale-108"
        style={{ width: size, height: size }}
      >
        <Image src="/gdg.png" alt="" width={size} height={size} className="size-[88%]" priority />
      </span>
      {withText && (
        <span className="flex flex-col gap-1">
          <span className="font-display text-[19px] leading-none font-extrabold whitespace-nowrap text-on-surface">
            GDG <span className="font-light">Siliguri</span>
          </span>
          <span className="text-eyebrow leading-none text-[10px] text-on-surface-variant">Admin</span>
        </span>
      )}
    </span>
  );
}
