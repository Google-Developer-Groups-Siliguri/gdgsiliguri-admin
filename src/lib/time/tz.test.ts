import { describe, expect, it } from "vitest";

import {
  addDays,
  formatLegacyDate,
  formatLegacyDateTime,
  formatLegacyTime,
  formatTime24,
  parseLegacyDateTime,
  parseLegacyTime,
  zonedToUtc,
} from "./tz";

const IST = "Asia/Kolkata";

describe("zonedToUtc", () => {
  it("reads wall-clock time in the given zone", () => {
    expect(zonedToUtc("2026-11-14", "08:00", IST).toISOString()).toBe("2026-11-14T02:30:00.000Z");
    expect(zonedToUtc("2026-11-14", "00:00", IST).toISOString()).toBe("2026-11-13T18:30:00.000Z");
    expect(zonedToUtc("2026-07-01", "12:00", "America/New_York").toISOString()).toBe("2026-07-01T16:00:00.000Z");
    expect(zonedToUtc("2026-12-01", "12:00", "America/New_York").toISOString()).toBe("2026-12-01T17:00:00.000Z");
  });

  it("rejects malformed input", () => {
    expect(() => zonedToUtc("2026-11-14", "8am", IST)).toThrow(RangeError);
  });
});

describe("legacy formats", () => {
  const start = "2026-11-14T02:30:00.000Z";

  it("formats date-time, time and date in IST", () => {
    expect(formatLegacyDateTime(start, IST)).toBe("2026-11-14 08:00:00.000");
    expect(formatLegacyTime(start, IST)).toBe("08:00 AM");
    expect(formatLegacyDate(start, IST)).toBe("2026-11-14");
    expect(formatTime24(start, IST)).toBe("08:00");
  });

  it("handles noon, midnight and the 12 o'clock hours", () => {
    expect(formatLegacyTime(parseLegacyTime("2026-11-14", "12:00 PM", IST), IST)).toBe("12:00 PM");
    expect(formatLegacyTime(parseLegacyTime("2026-11-14", "12:10 AM", IST), IST)).toBe("12:10 AM");
    expect(formatLegacyTime(parseLegacyTime("2026-11-14", "12:10 PM", IST), IST)).toBe("12:10 PM");
    expect(parseLegacyTime("2026-11-14", "12:10 AM", IST).toISOString()).toBe("2026-11-13T18:40:00.000Z");
    expect(parseLegacyTime("2026-11-14", "12:10 PM", IST).toISOString()).toBe("2026-11-14T06:40:00.000Z");
  });

  it("formats an instant after midnight in IST as the next day", () => {
    const lateUtc = "2026-11-14T19:00:00.000Z";
    expect(formatLegacyDate(lateUtc, IST)).toBe("2026-11-15");
    expect(formatLegacyTime(lateUtc, IST)).toBe("12:30 AM");
  });

  it("round-trips the legacy date-time", () => {
    expect(parseLegacyDateTime("2026-11-12 20:00:00.000", IST).toISOString()).toBe("2026-11-12T14:30:00.000Z");
    expect(formatLegacyDateTime(parseLegacyDateTime("2026-11-12 20:00:00.000", IST), IST)).toBe(
      "2026-11-12 20:00:00.000",
    );
  });

  it("does not depend on the machine's time zone", () => {
    const original = process.env.TZ;
    process.env.TZ = "America/New_York";
    try {
      expect(formatLegacyDateTime(start, IST)).toBe("2026-11-14 08:00:00.000");
      expect(zonedToUtc("2026-11-14", "08:00", IST).toISOString()).toBe(start);
    } finally {
      process.env.TZ = original;
    }
  });

  it("adds days across month ends", () => {
    expect(addDays("2026-11-30", 1)).toBe("2026-12-01");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
  });
});
