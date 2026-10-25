import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

type PageTitleProps = {
  title: string;
  eyebrow?: string;
  size?: "large" | "medium";
  className?: string;
  children?: ReactNode;
};

export function PageTitle({ title, eyebrow, size = "large", className, children }: PageTitleProps) {
  const words = title.split(" ");
  const lead = words.slice(0, -1).join(" ");
  const accent = words[words.length - 1];
  return (
    <div className={cn("flex min-w-0 flex-col gap-2", className)}>
      {eyebrow && (
        <span className="flex items-center gap-2 text-eyebrow text-on-surface-variant">
          <span className="size-1.5 rounded-full bg-primary" aria-hidden />
          {eyebrow}
        </span>
      )}
      <h1
        className={cn(
          "font-display leading-[0.95] font-extralight tracking-[-0.045em] text-on-surface",
          size === "large" ? "text-[clamp(40px,6vw,64px)]" : "text-[clamp(36px,4.5vw,52px)]",
        )}
      >
        {lead && <>{lead} </>}
        <b className="font-extrabold text-primary">{accent}</b>
      </h1>
      {children}
    </div>
  );
}
