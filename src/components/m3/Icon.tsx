import { cn } from "@/lib/cn";

type IconProps = {
  name: string;
  filled?: boolean;
  size?: 18 | 20 | 24 | 32 | 40;
  className?: string;
  label?: string;
};

export function Icon({ name, filled = false, size = 24, className, label }: IconProps) {
  return (
    <span
      className={cn("material-symbols-rounded shrink-0", className)}
      data-filled={filled}
      style={{ fontSize: size, width: size, height: size }}
      aria-hidden={label ? undefined : true}
      aria-label={label}
      role={label ? "img" : undefined}
    >
      {name}
    </span>
  );
}
