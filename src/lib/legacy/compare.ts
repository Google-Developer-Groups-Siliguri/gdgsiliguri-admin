import { cleanUrl } from "@/lib/schema/v2/convert";

export function normalizeLegacy(value: unknown): unknown {
  if (typeof value === "string") return /^\s*https?:\/\//.test(value) ? cleanUrl(value) : value.trim();
  if (Array.isArray(value)) return value.map(normalizeLegacy);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, normalizeLegacy(entry)]));
  }
  return value;
}

export type JsonDiff = { pointer: string; expected: unknown; actual: unknown };

function escape(segment: string): string {
  return segment.replace(/~/g, "~0").replace(/\//g, "~1");
}

export function jsonDiff(expected: unknown, actual: unknown, pointer = ""): JsonDiff[] {
  if (Object.is(expected, actual)) return [];
  const bothObjects =
    expected !== null && actual !== null && typeof expected === "object" && typeof actual === "object";
  if (!bothObjects || Array.isArray(expected) !== Array.isArray(actual))
    return [{ pointer: pointer || "/", expected, actual }];
  const left = expected as Record<string, unknown>;
  const right = actual as Record<string, unknown>;
  const keys = [...new Set([...Object.keys(left), ...Object.keys(right)])];
  return keys.flatMap((key) => jsonDiff(left[key], right[key], `${pointer}/${escape(key)}`));
}
