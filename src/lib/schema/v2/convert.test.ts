import { GeoPoint, Timestamp } from "firebase-admin/firestore";
import { describe, expect, it } from "vitest";

import { cleanUrl, fromFirestore, toFirestore } from "./convert";
import { exampleNames, readExample } from "./test-examples";

describe("toFirestore / fromFirestore", () => {
  it.each(exampleNames())("%s round-trips", (name) => {
    const wire = readExample(name);
    expect(fromFirestore(toFirestore(wire))).toEqual(fromFirestore(toFirestore(fromFirestore(toFirestore(wire)))));
    expect(fromFirestore(toFirestore(wire))).toEqual(stripEmpty(wire));
  });

  it("turns ISO strings in *At fields into Timestamps and geo into a GeoPoint", () => {
    const stored = toFirestore({
      startAt: "2026-11-14T08:00:00+05:30",
      title: "2026-11-14T08:00:00+05:30",
      venue: { geo: { lat: 26.74, lng: 88.45 } },
    });
    expect(stored.startAt).toBeInstanceOf(Timestamp);
    expect((stored.startAt as Timestamp).toDate().toISOString()).toBe("2026-11-14T02:30:00.000Z");
    expect(stored.title).toBe("2026-11-14T08:00:00+05:30");
    expect((stored.venue as { geo: GeoPoint }).geo).toBeInstanceOf(GeoPoint);
  });

  it("keeps an empty alt, which marks a decorative image", () => {
    expect(toFirestore({ banner: { url: "https://a.dev/b.png", alt: "" } })).toEqual({
      banner: { url: "https://a.dev/b.png", alt: "" },
    });
  });

  it("omits undefined, empty strings and empty objects, but keeps empty arrays", () => {
    expect(
      toFirestore({ a: undefined, b: "", c: {}, d: { e: "" }, speakerIds: [], f: 0, g: false, h: ["", "x"] }),
    ).toEqual({ speakerIds: [], f: 0, g: false, h: ["", "x"] });
  });

  it("trims links and drops the updatedAt cache-buster", () => {
    expect(toFirestore({ photo: { url: " https://ik.imagekit.io/a/b.png?updatedAt=1761900074141 " } })).toEqual({
      photo: { url: "https://ik.imagekit.io/a/b.png" },
    });
  });

  it("passes server sentinels through untouched", () => {
    const at = Timestamp.now();
    expect(toFirestore({ updatedAt: at }).updatedAt).toBe(at);
  });
});

describe("cleanUrl", () => {
  it.each([
    ["https://a.dev/x.png?updatedAt=1", "https://a.dev/x.png"],
    ["https://a.dev/x.png?tr=w-1&updatedAt=1", "https://a.dev/x.png?tr=w-1"],
    ["https://a.dev/x.png?updatedAt=1&tr=w-1", "https://a.dev/x.png?tr=w-1"],
    ["https://a.dev/x?q=1", "https://a.dev/x?q=1"],
  ])("%s → %s", (input, output) => {
    expect(cleanUrl(input)).toBe(output);
  });
});

function stripEmpty(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stripEmpty);
  if (value && typeof value === "object") {
    const entries = Object.entries(value)
      .map(([key, entry]) => [key, stripEmpty(entry)] as const)
      .filter(
        ([key, entry]) =>
          (entry !== "" || key === "alt") &&
          !(entry && typeof entry === "object" && !Array.isArray(entry) && Object.keys(entry).length === 0),
      );
    return Object.fromEntries(entries);
  }
  return value;
}
