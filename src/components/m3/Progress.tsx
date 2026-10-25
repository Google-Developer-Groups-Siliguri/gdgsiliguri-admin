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
        "relative h-1.5 w-full overflow-hidden rounded-full bg-secondary-container",
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

export function LoadingIndicator({
  label = "Loading",
  size = 48,
  contained = false,
  className,
}: Omit<ProgressProps, "value"> & { size?: number; contained?: boolean }) {
  return (
    <span
      role="progressbar"
      aria-label={label}
      className={cn(
        "inline-grid shrink-0 place-items-center rounded-full",
        contained && "bg-primary-container",
        className,
      )}
      style={{ width: size, height: size }}
    >
      <span
        className={cn("animate-shape-morph", contained ? "bg-on-primary-container" : "bg-primary")}
        style={{ width: size * 0.7, height: size * 0.7, clipPath: "var(--s-cookie9)" }}
      />
    </span>
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
