"use client";

import { useSyncExternalStore } from "react";

import { applyThemePreference, effectiveTheme, readThemePreference } from "./theme";

const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  media.addEventListener("change", listener);
  return () => {
    listeners.delete(listener);
    media.removeEventListener("change", listener);
  };
}

function readEffective(): "light" | "dark" {
  return effectiveTheme(readThemePreference());
}

export function ThemeToggle() {
  const dark = useSyncExternalStore(subscribe, readEffective, () => "light") === "dark";
  const label = dark ? "Switch to light mode" : "Switch to dark mode";

  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={() => {
        applyThemePreference(dark ? "light" : "dark");
        listeners.forEach((listener) => listener());
      }}
      className="focus-ring relative h-11 w-20 shrink-0 cursor-pointer overflow-hidden rounded-[22px] bg-surface-container-high p-0 transition-[background-color] duration-[400ms]"
    >
      <span
        className="absolute top-1.5 size-8 transition-[left] duration-700 ease-spring"
        style={{ left: dark ? 42 : 6 }}
      >
        <span
          className="absolute inset-0 transition-[clip-path,background-color] duration-[700ms,500ms] ease-emph"
          style={{ clipPath: dark ? "var(--s-circle)" : "var(--s-sunny)", background: dark ? "#E9ECF5" : "#F9AB00" }}
        />
        <span
          className="absolute size-6 rounded-xl bg-surface-container-high transition-[top,right,background-color] duration-[700ms,700ms,400ms] ease-emph"
          style={{ top: dark ? -5 : -30, right: dark ? -7 : -30 }}
        />
      </span>
      <span
        className="absolute top-[13px] size-1 rounded-sm bg-on-surface-variant transition-[opacity,left] duration-[500ms,700ms] ease-emph"
        style={{ left: dark ? 16 : 28, opacity: dark ? 1 : 0 }}
      />
      <span
        className="absolute top-[26px] size-[3px] rounded-sm bg-on-surface-variant transition-[opacity,left] duration-[600ms,700ms] ease-emph"
        style={{ left: dark ? 26 : 36, opacity: dark ? 1 : 0 }}
      />
    </button>
  );
}
