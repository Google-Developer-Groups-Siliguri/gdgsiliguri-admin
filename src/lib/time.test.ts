import { describe, expect, it } from "vitest";

import { countdown, timeAgo } from "./time";

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
