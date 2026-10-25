import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

type FormSectionProps = {
  title: string;
  description?: ReactNode;
  className?: string;
  children: ReactNode;
};

export function FormSection({ title, description, className, children }: FormSectionProps) {
  return (
    <section
      className={cn(
        "flex flex-col gap-6 rounded-[28px] bg-surface-container p-5 compact:p-7 expanded:flex-row expanded:gap-10",
        "[--list-fill-hover:var(--md-sys-color-surface-container-highest)] [--list-fill:var(--md-sys-color-surface-container-high)]",
        className,
      )}
    >
      <div className="flex flex-col gap-1.5 expanded:w-60 expanded:shrink-0">
        <h2 className="font-display text-[20px] leading-tight font-extrabold text-on-surface">{title}</h2>
        {description && <p className="text-body-small leading-relaxed text-on-surface-variant">{description}</p>}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-5">{children}</div>
    </section>
  );
}
