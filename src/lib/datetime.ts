export const TIME_12H_PATTERN = /^(0[1-9]|1[0-2]):([0-5]\d) (AM|PM)$/;
export const DATE_PATTERN = /^(\d{4})-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
export const DATETIME_PATTERN =
  /^(\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])) ([01]\d|2[0-3]):([0-5]\d):([0-5]\d)\.(\d{3})$/;

export const SITE_UTC_OFFSET = "+05:30";

export type Time12 = { hour: number; minute: number; period: "AM" | "PM" };

function pad(value: number, length = 2): string {
  return String(value).padStart(length, "0");
}

export function parseTime12(value: string): Time12 | null {
  const match = TIME_12H_PATTERN.exec(value);
  if (!match) return null;
  return { hour: Number(match[1]), minute: Number(match[2]), period: match[3] as "AM" | "PM" };
}

export function formatTime12({ hour, minute, period }: Time12): string {
  return `${pad(hour)}:${pad(minute)} ${period}`;
}

export function time12ToMinutes(value: string): number | null {
  const time = parseTime12(value);
  if (!time) return null;
  const hour24 = (time.hour % 12) + (time.period === "PM" ? 12 : 0);
  return hour24 * 60 + time.minute;
}

export function minutesToTime12(totalMinutes: number): string {
  const normalized = ((totalMinutes % 1440) + 1440) % 1440;
  const hour24 = Math.floor(normalized / 60);
  const minute = normalized % 60;
  const period = hour24 >= 12 ? "PM" : "AM";
  const hour = hour24 % 12 === 0 ? 12 : hour24 % 12;
  return formatTime12({ hour, minute, period });
}

export function durationInMins(startTime: string, endTime: string): string | null {
  const start = time12ToMinutes(startTime);
  const end = time12ToMinutes(endTime);
  if (start === null || end === null || end <= start) return null;
  return String(end - start);
}

export type DateTimeParts = { date: string; time24: string; seconds: string; millis: string };

export function parseDateTime(value: string): DateTimeParts | null {
  const match = DATETIME_PATTERN.exec(value);
  if (!match) return null;
  return {
    date: match[1],
    time24: `${match[2]}:${match[3]}`,
    seconds: match[4],
    millis: match[5],
  };
}

export function formatDateTime(date: string, time24: string, seconds = "00", millis = "000"): string {
  return `${date} ${time24}:${seconds}.${millis}`;
}

export function dateTimeToEpoch(value: string, offset = SITE_UTC_OFFSET): number | null {
  const parts = parseDateTime(value);
  if (!parts) return null;
  const epoch = Date.parse(`${parts.date}T${parts.time24}:${parts.seconds}.${parts.millis}${offset}`);
  return Number.isNaN(epoch) ? null : epoch;
}

export function isValidDate(value: string): boolean {
  const match = DATE_PATTERN.exec(value);
  if (!match) return false;
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

export function toIsoDate(year: number, monthIndex: number, day: number): string {
  return `${pad(year, 4)}-${pad(monthIndex + 1)}-${pad(day)}`;
}

export function time24ToTime12(time24: string): string | null {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(time24);
  if (!match) return null;
  return minutesToTime12(Number(match[1]) * 60 + Number(match[2]));
}

export function time12ToTime24(value: string): string | null {
  const minutes = time12ToMinutes(value);
  if (minutes === null) return null;
  return `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;
}
