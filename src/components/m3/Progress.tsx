import { cn } from "@/lib/cn";

type ProgressProps = {
  value?: number;
  label?: string;
  className?: string;
};

export function LinearProgress({ value, label = "Loading", className }: ProgressProps) {
  const indeterminate = value === undefined;
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={indeterminate ? undefined : Math.round(value * 100)}
      className={cn(
        "relative h-1 w-full overflow-hidden rounded-full bg-secondary-container",
        className,
      )}
    >
      <div
        className={cn(
          "absolute inset-y-0 rounded-full bg-primary",
          indeterminate
            ? "animate-linear-indeterminate"
            : "start-0 transition-[width] duration-medium ease-standard",
        )}
        style={indeterminate ? undefined : { width: `${Math.min(1, Math.max(0, value)) * 100}%` }}
      />
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
      className={cn(indeterminate && "animate-spin", className)}
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
