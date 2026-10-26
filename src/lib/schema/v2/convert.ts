import { GeoPoint, Timestamp } from "firebase-admin/firestore";

const INSTANT_KEY = /At$/;
const KEEP_EMPTY = new Set(["alt"]);
const ISO_INSTANT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})$/;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && Object.getPrototypeOf(value) === Object.prototype;
}

function isLatLng(value: unknown): value is { lat: number; lng: number } {
  return isPlainObject(value) && typeof value.lat === "number" && typeof value.lng === "number";
}

export function cleanUrl(value: string): string {
  return value
    .trim()
    .replace(/([?&])updatedAt=[^&#]*(&?)/g, (_, separator: string, next: string) => (next ? separator : ""))
    .replace(/[?&]$/, "");
}

function convertString(key: string | null, value: string): unknown {
  if (key && INSTANT_KEY.test(key) && ISO_INSTANT.test(value)) return Timestamp.fromMillis(Date.parse(value));
  if (/^\s*https?:\/\//.test(value)) return cleanUrl(value);
  return value;
}

function convert(key: string | null, value: unknown): unknown {
  if (typeof value === "string") return convertString(key, value);
  if (Array.isArray(value)) return value.map((entry) => convert(null, entry)).filter((entry) => entry !== undefined);
  if (key === "geo" && isLatLng(value)) return new GeoPoint(value.lat, value.lng);
  if (!isPlainObject(value)) return value;
  const entries = Object.entries(value)
    .map(([field, entry]) => [field, convert(field, entry)] as const)
    .filter(
      ([field, entry]) =>
        entry !== undefined &&
        (entry !== "" || KEEP_EMPTY.has(field)) &&
        !(isPlainObject(entry) && Object.keys(entry).length === 0),
    );
  return Object.fromEntries(entries);
}

export function toFirestore<T>(value: T): Record<string, unknown> {
  return convert(null, value) as Record<string, unknown>;
}

export function fromFirestore<T = unknown>(value: unknown): T {
  if (value instanceof Timestamp) return value.toDate().toISOString() as T;
  if (value instanceof GeoPoint) return { lat: value.latitude, lng: value.longitude } as T;
  if (Array.isArray(value)) return value.map((entry) => fromFirestore(entry)) as T;
  if (isPlainObject(value)) {
    return Object.fromEntries(Object.entries(value).map(([field, entry]) => [field, fromFirestore(entry)])) as T;
  }
  return value as T;
}
