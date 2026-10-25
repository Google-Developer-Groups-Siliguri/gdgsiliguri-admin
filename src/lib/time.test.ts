import { describe, expect, it } from "vitest";

import { countdown, eventDateParts, formatEventMoment, leadTime, timeAgo } from "./time";

const now = Date.parse("2026-10-23T12:00:00Z");

describe("timeAgo", () => {
  it("describes past times in words", () => {
    expect(timeAgo("2026-10-23T11:59:30Z", now)).toBe("just now");
    expect(timeAgo("2026-10-23T11:55:00Z", now)).toBe("5 minutes ago");
    expect(timeAgo("2026-10-22T12:00:00Z", now)).toBe("yesterday");
    expect(timeAgo("2026-10-02T12:00:00Z", now)).toBe("3 weeks ago");
    expect(timeAgo(null, now)).toBe("never");
  });
});

describe("countdown", () => {
  it("splits the remaining time", () => {
    expect(countdown(now + ((2 * 24 + 3) * 3600 + 4 * 60 + 5) * 1000, now)).toEqual({
      days: 2,
      hours: 3,
      minutes: 4,
      seconds: 5,
    });
  });

  it("is null once the time has passed", () => {
    expect(countdown(now - 1000, now)).toBeNull();
  });
});

describe("eventDateParts", () => {
  it("reads the date in India time", () => {
    expect(eventDateParts(Date.parse("2026-11-13T20:00:00Z"))).toEqual({
      weekday: "SAT",
      day: "14",
      month: "NOV",
      year: "2026",
    });
  });
});

describe("formatEventMoment", () => {
  it("formats the start in India time", () => {
    expect(formatEventMoment(Date.parse("2026-11-14T02:30:00Z"))).toBe("Sat, 14 Nov 2026 · 8:00 AM");
  });
});

describe("leadTime", () => {
  const start = Date.parse("2026-11-14T02:30:00Z");
  it("says how long before the start registration closes", () => {
    expect(leadTime(start, start - 36 * 3_600_000)).toBe("36 hours before start");
    expect(leadTime(start, start - 5 * 24 * 3_600_000)).toBe("5 days before start");
    expect(leadTime(start, start + 3_600_000)).toBe("After the event starts");
  });
});
