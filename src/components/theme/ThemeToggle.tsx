"use client";

import { useSyncExternalStore } from "react";

import { Menu } from "@/components/m3/Menu";
import { IconButton } from "@/components/m3/IconButton";

import { applyThemePreference, readThemePreference, type ThemePreference } from "./theme";

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

const ICONS: Record<ThemePreference, string> = {
  light: "light_mode",
  dark: "dark_mode",
  system: "brightness_auto",
};

export function ThemeToggle() {
  const preference = useSyncExternalStore(subscribe, readThemePreference, () => "system" as const);
  return (
    <Menu
      trigger={<IconButton icon={ICONS[preference]} label="Theme" />}
      items={[
        { label: "Light", icon: "light_mode", onSelect: () => setPreference("light") },
        { label: "Dark", icon: "dark_mode", onSelect: () => setPreference("dark") },
        { label: "System", icon: "brightness_auto", onSelect: () => setPreference("system") },
      ]}
    />
  );
}
