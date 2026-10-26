import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { argbFromHex, hexFromArgb, TonalPalette, type DynamicScheme } from "@material/material-color-utilities";

const SOURCE = "gdg-siliguri-website src/m3e-tokens.css";
const OUTPUT = fileURLToPath(new URL("../src/app/theme.css", import.meta.url));

type Role = (typeof ROLES)[number];
type Mode = "light" | "dark";

const WEBSITE: Record<Mode, Record<string, string>> = {
  light: {
    pri: "#00722C",
    "on-pri": "#FFFFFF",
    "pri-c": "#94FFA7",
    "on-pri-c": "#002307",
    sec: "#4D6650",
    "on-sec": "#FFFFFF",
    "sec-c": "#CFEBD2",
    "on-sec-c": "#0B210F",
    ter: "#006A7F",
    "on-ter": "#FFFFFF",
    "ter-c": "#B4EDFF",
    "on-ter-c": "#002029",
    srf: "#F6FBF6",
    "srf-0": "#FFFFFF",
    "srf-1": "#F0F5F1",
    "srf-2": "#EAEFEB",
    "srf-3": "#E5EAE5",
    "srf-4": "#DFE4E0",
    "on-srf": "#191D19",
    "on-srf-v": "#3F4A40",
    out: "#6F7B70",
    "out-v": "#BDCBBF",
    "inv-srf": "#2E322E",
    "inv-on-srf": "#EDF2EE",
    "inv-pri": "#74E38A",
    err: "#AA2422",
    "err-c": "#FFD8D3",
    "on-err-c": "#3D0001",
  },
  dark: {
    pri: "#74E38A",
    "on-pri": "#003C13",
    "pri-c": "#00561F",
    "on-pri-c": "#94FFA7",
    sec: "#B3CFB7",
    "on-sec": "#203723",
    "sec-c": "#364E39",
    "on-sec-c": "#CFEBD2",
    ter: "#68D8F6",
    "on-ter": "#003744",
    "ter-c": "#005061",
    "on-ter-c": "#B4EDFF",
    srf: "#111411",
    "srf-0": "#0C0F0C",
    "srf-1": "#191D19",
    "srf-2": "#1D211D",
    "srf-3": "#272B28",
    "srf-4": "#323632",
    "on-srf": "#DFE4E0",
    "on-srf-v": "#BDCBBF",
    out: "#889589",
    "out-v": "#3F4A40",
    "inv-srf": "#DFE4E0",
    "inv-on-srf": "#2E322E",
    "inv-pri": "#00722C",
    err: "#FFAFA5",
    "err-c": "#89000A",
    "on-err-c": "#FFD8D3",
  },
};

const PRIMARY = TonalPalette.fromInt(argbFromHex(WEBSITE.light.pri));
const NEUTRAL = TonalPalette.fromInt(argbFromHex(WEBSITE.light["srf-4"]));
const NEUTRAL_VARIANT = TonalPalette.fromInt(argbFromHex(WEBSITE.light["on-srf-v"]));
const ERROR = TonalPalette.fromInt(argbFromHex(WEBSITE.light.err));

function tone(palette: TonalPalette, value: number): string {
  return hexFromArgb(palette.tone(value)).toUpperCase();
}

function scheme(mode: Mode): Record<Role, string> {
  const w = WEBSITE[mode];
  const dark = mode === "dark";
  return {
    primary: w.pri,
    onPrimary: w["on-pri"],
    primaryContainer: w["pri-c"],
    onPrimaryContainer: w["on-pri-c"],
    primaryFixed: tone(PRIMARY, 90),
    primaryFixedDim: tone(PRIMARY, 80),
    onPrimaryFixed: tone(PRIMARY, 10),
    onPrimaryFixedVariant: tone(PRIMARY, 30),
    secondary: w.sec,
    onSecondary: w["on-sec"],
    secondaryContainer: w["sec-c"],
    onSecondaryContainer: w["on-sec-c"],
    tertiary: w.ter,
    onTertiary: w["on-ter"],
    tertiaryContainer: w["ter-c"],
    onTertiaryContainer: w["on-ter-c"],
    error: w.err,
    onError: dark ? tone(ERROR, 20) : "#FFFFFF",
    errorContainer: w["err-c"],
    onErrorContainer: w["on-err-c"],
    background: w.srf,
    onBackground: w["on-srf"],
    surface: w.srf,
    surfaceDim: dark ? w.srf : tone(NEUTRAL, 87),
    surfaceBright: dark ? tone(NEUTRAL, 24) : w.srf,
    surfaceContainerLowest: w["srf-0"],
    surfaceContainerLow: w["srf-1"],
    surfaceContainer: w["srf-2"],
    surfaceContainerHigh: w["srf-3"],
    surfaceContainerHighest: w["srf-4"],
    onSurface: w["on-srf"],
    surfaceVariant: dark ? w["out-v"] : tone(NEUTRAL_VARIANT, 90),
    onSurfaceVariant: w["on-srf-v"],
    surfaceTint: w.pri,
    outline: w.out,
    outlineVariant: w["out-v"],
    inverseSurface: w["inv-srf"],
    inverseOnSurface: w["inv-on-srf"],
    inversePrimary: w["inv-pri"],
    scrim: "#000000",
    shadow: "#000000",
  };
}

const ROLES = [
  "primary",
  "onPrimary",
  "primaryContainer",
  "onPrimaryContainer",
  "primaryFixed",
  "primaryFixedDim",
  "onPrimaryFixed",
  "onPrimaryFixedVariant",
  "secondary",
  "onSecondary",
  "secondaryContainer",
  "onSecondaryContainer",
  "tertiary",
  "onTertiary",
  "tertiaryContainer",
  "onTertiaryContainer",
  "error",
  "onError",
  "errorContainer",
  "onErrorContainer",
  "background",
  "onBackground",
  "surface",
  "surfaceDim",
  "surfaceBright",
  "surfaceContainerLowest",
  "surfaceContainerLow",
  "surfaceContainer",
  "surfaceContainerHigh",
  "surfaceContainerHighest",
  "onSurface",
  "surfaceVariant",
  "onSurfaceVariant",
  "surfaceTint",
  "outline",
  "outlineVariant",
  "inverseSurface",
  "inverseOnSurface",
  "inversePrimary",
  "scrim",
  "shadow",
] as const satisfies readonly (keyof DynamicScheme)[];

function kebab(role: string): string {
  return role.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
}

function declarations(isDark: boolean, indent: string): string {
  const colors = scheme(isDark ? "dark" : "light");
  return ROLES.map((role) => `${indent}--md-sys-color-${kebab(role)}: ${colors[role]};`).join("\n");
}

const themeMappings = ROLES.map((role) => `  --color-${kebab(role)}: var(--md-sys-color-${kebab(role)});`).join("\n");

const css = `/* Generated by scripts/generate-theme.ts from the ${SOURCE} palette. Do not edit. */

:root,
[data-theme="light"] {
  color-scheme: light;
${declarations(false, "  ")}
}

[data-theme="dark"] {
  color-scheme: dark;
${declarations(true, "  ")}
}

@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    color-scheme: dark;
${declarations(true, "    ")}
  }
}

@theme inline {
${themeMappings}
}
`;

writeFileSync(OUTPUT, css);
console.log(`Wrote ${OUTPUT}`);
