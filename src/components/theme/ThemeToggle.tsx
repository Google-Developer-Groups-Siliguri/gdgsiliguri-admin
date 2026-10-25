"use client";

import { useSyncExternalStore, type ButtonHTMLAttributes } from "react";

import { Menu } from "@/components/m3/Menu";
import { cn } from "@/lib/cn";

import { applyThemePreference, effectiveTheme, readThemePreference, type ThemePreference } from "./theme";

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

function setPreference(preference: ThemePreference) {
  applyThemePreference(preference);
  listeners.forEach((listener) => listener());
}

function readSnapshot(): string {
  const preference = readThemePreference();
  return `${preference}:${effectiveTheme(preference)}`;
}

type SwitchProps = ButtonHTMLAttributes<HTMLButtonElement> & { dark: boolean; auto: boolean };

function ThemeSwitch({ dark, auto, className, ...props }: SwitchProps) {
  return (
    <button
      type="button"
      aria-label="Theme"
      title={auto ? "Theme: system" : dark ? "Theme: dark" : "Theme: light"}
      className={cn(
        "focus-ring relative h-10 w-[72px] shrink-0 cursor-pointer overflow-hidden rounded-full bg-surface-container-high",
        "transition-[scale] duration-500 ease-spring hover:scale-105 active:scale-95",
        className,
      )}
      {...props}
    >
      <span
        className="absolute top-1.5 size-7 transition-[left] duration-700 ease-spring"
        style={{ left: dark ? 38 : 6 }}
      >
        <span
          className="absolute inset-0 transition-[clip-path,background-color] duration-[700ms,500ms] ease-emph"
          style={{ clipPath: dark ? "var(--s-circle)" : "var(--s-sunny)", background: dark ? "#E9ECF5" : "#F9AB00" }}
        />
        <span
          className="absolute size-5 rounded-xl bg-surface-container-high transition-[top,right] duration-700 ease-emph"
          style={{ top: dark ? -4 : -28, right: dark ? -6 : -28 }}
        />
      </span>
      <span
        className="absolute top-[11px] size-1 rounded-full bg-on-surface-variant transition-[opacity,left] duration-[500ms,700ms] ease-emph"
        style={{ left: dark ? 14 : 26, opacity: dark ? 1 : 0 }}
      />
      <span
        className="absolute top-[23px] size-[3px] rounded-full bg-on-surface-variant transition-[opacity,left] duration-[600ms,700ms] ease-emph"
        style={{ left: dark ? 23 : 32, opacity: dark ? 1 : 0 }}
      />
      {auto && (
        <span className="absolute end-1 bottom-1 rounded-full bg-tertiary-container px-1 text-[8px] leading-3 font-extrabold text-on-tertiary-container">
          A
        </span>
      )}
    </button>
  );
}

export function ThemeToggle() {
  const snapshot = useSyncExternalStore(subscribe, readSnapshot, () => "system:light");
  const [preference, effective] = snapshot.split(":");
  return (
    <Menu
      trigger={<ThemeSwitch dark={effective === "dark"} auto={preference === "system"} />}
      items={[
        { label: "Light", icon: "light_mode", onSelect: () => setPreference("light") },
        { label: "Dark", icon: "dark_mode", onSelect: () => setPreference("dark") },
        { label: "System", icon: "brightness_auto", onSelect: () => setPreference("system") },
      ]}
    />
  );
}
