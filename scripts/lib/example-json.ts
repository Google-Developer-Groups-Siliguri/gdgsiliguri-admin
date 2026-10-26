import { GeoPoint, Timestamp } from "firebase-admin/firestore";

type TimestampMarker = { $timestamp: string };
type GeoPointMarker = { $geopoint: [number, number] };

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && Object.getPrototypeOf(value) === Object.prototype;
}

function isTimestampMarker(value: unknown): value is TimestampMarker {
  return isPlainObject(value) && Object.keys(value).length === 1 && typeof value.$timestamp === "string";
}

function isGeoPointMarker(value: unknown): value is GeoPointMarker {
  return (
    isPlainObject(value) &&
    Object.keys(value).length === 1 &&
    Array.isArray(value.$geopoint) &&
    value.$geopoint.length === 2 &&
    value.$geopoint.every((part) => typeof part === "number")
  );
}

export function fromExampleJson(value: unknown): unknown {
  if (isTimestampMarker(value)) {
    const millis = Date.parse(value.$timestamp);
    if (Number.isNaN(millis)) throw new Error(`Invalid $timestamp: ${value.$timestamp}`);
    return Timestamp.fromMillis(millis);
  }
  if (isGeoPointMarker(value)) return new GeoPoint(value.$geopoint[0], value.$geopoint[1]);
  if (Array.isArray(value)) return value.map(fromExampleJson);
  if (isPlainObject(value)) {
    return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, fromExampleJson(entry)]));
  }
  return value;
}

export function toExampleJson(value: unknown): unknown {
  if (value instanceof Timestamp) return { $timestamp: value.toDate().toISOString() };
  if (value instanceof GeoPoint) return { $geopoint: [value.latitude, value.longitude] };
  if (Array.isArray(value)) return value.map(toExampleJson);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, toExampleJson(entry)]));
  }
  return value;
}
