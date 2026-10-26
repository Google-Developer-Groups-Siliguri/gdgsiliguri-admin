import { GeoPoint, Timestamp } from "firebase-admin/firestore";
import { describe, expect, it } from "vitest";

import { fromExampleJson, toExampleJson } from "./example-json";

describe("example JSON markers", () => {
  it("converts timestamps and geopoints at any depth", () => {
    const value = fromExampleJson({
      startAt: { $timestamp: "2026-11-14T08:00:00+05:30" },
      venue: { geo: { $geopoint: [26.74, 88.45] } },
      list: [{ at: { $timestamp: "2026-11-14T02:30:00Z" } }],
    }) as { startAt: Timestamp; venue: { geo: GeoPoint }; list: { at: Timestamp }[] };
    expect(value.startAt.toDate().toISOString()).toBe("2026-11-14T02:30:00.000Z");
    expect(value.venue.geo.isEqual(new GeoPoint(26.74, 88.45))).toBe(true);
    expect(value.list[0].at.isEqual(value.startAt)).toBe(true);
  });

  it("round-trips through the markers", () => {
    const original = { at: Timestamp.fromMillis(1_800_000_000_000), geo: new GeoPoint(1, 2), name: "x", tags: ["a"] };
    expect(fromExampleJson(toExampleJson(original))).toEqual(original);
  });

  it("leaves look-alike objects alone", () => {
    expect(fromExampleJson({ $timestamp: "x", other: 1 })).toEqual({ $timestamp: "x", other: 1 });
    expect(() => fromExampleJson({ $timestamp: "not a date" })).toThrow(/Invalid \$timestamp/);
  });
});
