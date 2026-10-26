export const DEFAULT_TIME_ZONE = "Asia/Kolkata";

export type Instant = string | number | Date;

type Parts = { year: number; month: number; day: number; hour: number; minute: number; second: number };

const formatters = new Map<string, Intl.DateTimeFormat>();

function formatter(timeZone: string): Intl.DateTimeFormat {
  let cached = formatters.get(timeZone);
  if (!cached) {
    cached = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    formatters.set(timeZone, cached);
  }
  return cached;
}

export function toMillis(instant: Instant): number {
  const millis =
    instant instanceof Date ? instant.getTime() : typeof instant === "number" ? instant : Date.parse(instant);
  if (Number.isNaN(millis)) throw new RangeError(`Not a valid instant: ${String(instant)}`);
  return millis;
}

export function zonedParts(instant: Instant, timeZone: string): Parts & { millisecond: number } {
  const millis = toMillis(instant);
  const values = Object.fromEntries(
    formatter(timeZone)
      .formatToParts(millis)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, Number(part.value)]),
  ) as Record<keyof Parts, number>;
  return { ...values, millisecond: ((millis % 1000) + 1000) % 1000 };
}

function offsetMs(millis: number, timeZone: string): number {
  const parts = zonedParts(millis, timeZone);
  const asUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
  return asUtc - Math.floor(millis / 1000) * 1000;
}

const DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIME_24 = /^([01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d)(?:\.(\d{3}))?)?$/;
const TIME_12 = /^(0?[1-9]|1[0-2]):([0-5]\d)\s*(AM|PM)$/i;

export function zonedToUtc(date: string, time: string, timeZone: string = DEFAULT_TIME_ZONE): Date {
  const day = DATE.exec(date);
  const clock = TIME_24.exec(time);
  if (!day || !clock) throw new RangeError(`Not a valid date and time: ${date} ${time}`);
  const wall = Date.UTC(
    Number(day[1]),
    Number(day[2]) - 1,
    Number(day[3]),
    Number(clock[1]),
    Number(clock[2]),
    Number(clock[3] ?? 0),
    Number(clock[4] ?? 0),
  );
  let guess = wall - offsetMs(wall, timeZone);
  guess = wall - offsetMs(guess, timeZone);
  return new Date(guess);
}

function pad(value: number, length = 2): string {
  return String(value).padStart(length, "0");
}

export function formatLegacyDate(instant: Instant, timeZone: string = DEFAULT_TIME_ZONE): string {
  const parts = zonedParts(instant, timeZone);
  return `${pad(parts.year, 4)}-${pad(parts.month)}-${pad(parts.day)}`;
}

export function formatLegacyDateTime(instant: Instant, timeZone: string = DEFAULT_TIME_ZONE): string {
  const parts = zonedParts(instant, timeZone);
  return `${formatLegacyDate(instant, timeZone)} ${pad(parts.hour)}:${pad(parts.minute)}:${pad(parts.second)}.${pad(parts.millisecond, 3)}`;
}

export function formatLegacyTime(instant: Instant, timeZone: string = DEFAULT_TIME_ZONE): string {
  const { hour, minute } = zonedParts(instant, timeZone);
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${pad(hour12)}:${pad(minute)} ${hour < 12 ? "AM" : "PM"}`;
}

export function formatTime24(instant: Instant, timeZone: string = DEFAULT_TIME_ZONE): string {
  const { hour, minute } = zonedParts(instant, timeZone);
  return `${pad(hour)}:${pad(minute)}`;
}

export function parseLegacyDateTime(value: string, timeZone: string = DEFAULT_TIME_ZONE): Date {
  const [date, time] = value.trim().split(/\s+/);
  return zonedToUtc(date, time ?? "00:00", timeZone);
}

export function time12To24(value: string): string {
  const match = TIME_12.exec(value.trim());
  if (!match) throw new RangeError(`Not a valid hh:mm AM/PM time: ${value}`);
  const hour = (Number(match[1]) % 12) + (match[3].toUpperCase() === "PM" ? 12 : 0);
  return `${pad(hour)}:${match[2]}`;
}

export function parseLegacyTime(date: string, time12: string, timeZone: string = DEFAULT_TIME_ZONE): Date {
  return zonedToUtc(date, time12To24(time12), timeZone);
}

export function isoInZone(date: string, time: string, timeZone: string = DEFAULT_TIME_ZONE): string {
  return zonedToUtc(date, time, timeZone).toISOString();
}

export function addDays(date: string, days: number): string {
  const day = DATE.exec(date);
  if (!day) throw new RangeError(`Not a valid date: ${date}`);
  return new Date(Date.UTC(Number(day[1]), Number(day[2]) - 1, Number(day[3]) + days)).toISOString().slice(0, 10);
}
