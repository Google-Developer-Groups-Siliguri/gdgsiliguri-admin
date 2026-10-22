import { cn } from "@/lib/cn";

type DividerProps = {
  inset?: "none" | "start" | "middle";
  vertical?: boolean;
  className?: string;
};

export function Divider({ inset = "none", vertical = false, className }: DividerProps) {
  return (
    <div
      role="separator"
      aria-orientation={vertical ? "vertical" : "horizontal"}
      className={cn(
        "shrink-0 bg-outline-variant",
        vertical ? "w-px self-stretch" : "h-px w-auto",
        inset === "start" && "ms-4",
        inset === "middle" && "mx-4",
        className,
      )}
    />
  );
}
