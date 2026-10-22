import { cn } from "@/lib/cn";

function GdgBrackets({ size }: { size: number }) {
  return (
    <svg width={size} height={size * 0.6} viewBox="0 0 50 30" aria-hidden fill="none">
      <g strokeWidth="6.5" strokeLinecap="round">
        <path d="M17 4 5 11" stroke="#EA4335" />
        <path d="M5 19l12 7" stroke="#4285F4" />
        <path d="M33 4l12 7" stroke="#34A853" />
        <path d="M45 19 33 26" stroke="#FBBC04" />
      </g>
    </svg>
  );
}

type BrandMarkProps = { className?: string; withText?: boolean; size?: number };

export function BrandMark({ className, withText = true, size = 40 }: BrandMarkProps) {
  return (
    <span className={cn("inline-flex items-center gap-3", className)}>
      <GdgBrackets size={size} />
      {withText && (
        <span className="flex flex-col gap-0.5">
          <span className="text-title-medium leading-none text-on-surface">GDG Siliguri</span>
          <span className="text-label-medium leading-none text-on-surface-variant">Admin</span>
        </span>
      )}
    </span>
  );
}
