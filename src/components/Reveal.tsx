"use client";

import { useEffect, useRef, type HTMLAttributes } from "react";

const STAGGER_MS = 70;
const MAX_STAGGER_STEPS = 8;

type RevealProps = HTMLAttributes<HTMLDivElement> & { index?: number };

export function Reveal({ index = 0, style, ...props }: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        observer.disconnect();
        element.dataset.revealed = "";
      },
      { threshold: 0.1 },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      data-reveal=""
      style={{ ...style, transitionDelay: `${Math.min(index, MAX_STAGGER_STEPS) * STAGGER_MS}ms` }}
      {...props}
    />
  );
}
