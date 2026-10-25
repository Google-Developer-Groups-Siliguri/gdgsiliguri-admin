import { cn } from "@/lib/cn";

import { LoadingIndicator } from "./LoadingIndicator";

export { LoadingIndicator };

type ProgressProps = {
  value?: number;
  label?: string;
  className?: string;
};

export function LinearProgress({ value, label = "Loading", className }: ProgressProps) {
  const indeterminate = value === undefined;
  const fraction = indeterminate ? 0 : Math.min(1, Math.max(0, value));
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={indeterminate ? undefined : Math.round(fraction * 100)}
      className={cn("relative h-3.5 w-full overflow-hidden", className)}
    >
      <div
        className="absolute end-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-primary-container transition-[left] duration-medium ease-emph"
        style={{ left: indeterminate ? 0 : `calc(${fraction * 100}% + 6px)` }}
      />
      <div className="absolute end-0 top-1/2 size-1 -translate-y-1/2 rounded-full bg-primary" />
      <div
        className={cn(
          "absolute inset-y-0",
          indeterminate ? "animate-linear-indeterminate" : "start-0 transition-[width] duration-medium ease-emph",
        )}
        style={indeterminate ? undefined : { width: `${fraction * 100}%` }}
      >
        <div className="wavy size-full bg-primary" />
      </div>
    </div>
  );
}

type CircularProgressProps = ProgressProps & { size?: number };

export function CircularProgress({
  value,
  label = "Loading",
  size = 48,
  className,
}: CircularProgressProps) {
  const indeterminate = value === undefined;
  if (indeterminate) return <LoadingIndicator label={label} size={size} className={className} />;
  const radius = 20;
  const circumference = 2 * Math.PI * radius;
  const fraction = indeterminate ? 0.25 : Math.min(1, Math.max(0, value));
  return (
    <svg
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={indeterminate ? undefined : Math.round(fraction * 100)}
      viewBox="0 0 48 48"
      width={size}
      height={size}
      className={className}
    >
      <circle cx="24" cy="24" r={radius} fill="none" strokeWidth="4" className="stroke-secondary-container" />
      <circle
        cx="24"
        cy="24"
        r={radius}
        fill="none"
        strokeWidth="4"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={circumference * (1 - fraction)}
        transform="rotate(-90 24 24)"
        className="stroke-primary transition-[stroke-dashoffset] duration-medium"
      />
    </svg>
  );
}
