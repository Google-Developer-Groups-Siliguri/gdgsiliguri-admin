const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 365 * 24 * 3600],
  ["month", 30 * 24 * 3600],
  ["week", 7 * 24 * 3600],
  ["day", 24 * 3600],
  ["hour", 3600],
  ["minute", 60],
];

const relative = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
const absolute = new Intl.DateTimeFormat("en-IN", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Kolkata",
});

const eventDate = new Intl.DateTimeFormat("en-IN", {
  weekday: "short",
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "Asia/Kolkata",
});

export type EventDateParts = { weekday: string; day: string; month: string; year: string };

export function eventDateParts(epochMs: number): EventDateParts {
  const parts = Object.fromEntries(eventDate.formatToParts(epochMs).map((part) => [part.type, part.value]));
  return {
    weekday: String(parts.weekday).toUpperCase(),
    day: String(parts.day),
    month: String(parts.month).toUpperCase(),
    year: String(parts.year),
  };
}

export function timeAgo(iso: string | null, now = Date.now()): string {
  if (!iso) return "never";
  const seconds = Math.round((Date.parse(iso) - now) / 1000);
  for (const [unit, size] of UNITS) {
    if (Math.abs(seconds) >= size) return relative.format(Math.round(seconds / size), unit);
  }
  return "just now";
}

export function formatDateTime(iso: string | null): string {
  return iso ? absolute.format(new Date(iso)) : "—";
}

export type Countdown = { days: number; hours: number; minutes: number; seconds: number };

export function countdown(targetMs: number, now = Date.now()): Countdown | null {
  const remaining = Math.floor((targetMs - now) / 1000);
  if (remaining <= 0) return null;
  return {
    days: Math.floor(remaining / 86400),
    hours: Math.floor((remaining % 86400) / 3600),
    minutes: Math.floor((remaining % 3600) / 60),
    seconds: remaining % 60,
  };
}
