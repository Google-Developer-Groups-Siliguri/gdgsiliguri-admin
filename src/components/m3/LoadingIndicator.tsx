"use client";

import { useEffect, useRef } from "react";

import { cn } from "@/lib/cn";

const SHAPES = ["cookie7", "cookie9", "pentagon", "clover4", "sunny", "cookie4", "clover4"];
const STEP_MS = 650;
const TURN_DEG = 140;

type LoadingIndicatorProps = {
  label?: string;
  size?: number;
  contained?: boolean;
  color?: string;
  className?: string;
};

export function LoadingIndicator({
  label = "Loading",
  size = 48,
  contained = false,
  color = "var(--md-sys-color-primary)",
  className,
}: LoadingIndicatorProps) {
  const shapeRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const element = shapeRef.current;
    if (!element || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let step = 0;
    const timer = window.setInterval(() => {
      step += 1;
      element.style.clipPath = `var(--s-${SHAPES[step % SHAPES.length]})`;
      element.style.rotate = `${step * TURN_DEG}deg`;
    }, STEP_MS);
    return () => window.clearInterval(timer);
  }, []);

  const inner = contained ? size * 0.62 : size;
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
        ref={shapeRef}
        style={{
          background: color,
          width: inner,
          height: inner,
          clipPath: `var(--s-${SHAPES[0]})`,
          transition: "clip-path var(--sp-fast-d) var(--sp-fast), rotate var(--sp-default-d) var(--sp-default)",
        }}
      />
    </span>
  );
}
