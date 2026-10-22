import { describe, expect, it } from "vitest";

import {
  dateTimeToEpoch,
  durationInMins,
  formatDateTime,
  isValidDate,
  minutesToTime12,
  parseDateTime,
  parseTime12,
  time12ToMinutes,
  time12ToTime24,
  time24ToTime12,
} from "./datetime";

describe("12-hour times", () => {
  it("parses the schedule format", () => {
    expect(parseTime12("08:00 AM")).toEqual({ hour: 8, minute: 0, period: "AM" });
    expect(parseTime12("12:40 PM")).toEqual({ hour: 12, minute: 40, period: "PM" });
  });

  it("rejects other formats", () => {
    for (const value of ["8:00 AM", "08:00AM", "13:00 PM", "08:60 AM", "08:00 am", ""]) {
      expect(parseTime12(value)).toBeNull();
    }
  });

  it("converts to minutes since midnight around noon and midnight", () => {
    expect(time12ToMinutes("12:10 AM")).toBe(10);
    expect(time12ToMinutes("12:10 PM")).toBe(730);
    expect(time12ToMinutes("05:00 PM")).toBe(1020);
  });

  it("round-trips through minutes", () => {
    for (const value of ["12:00 AM", "12:00 PM", "08:05 AM", "11:59 PM"]) {
      expect(minutesToTime12(time12ToMinutes(value)!)).toBe(value);
    }
  });

  it("converts between 12 and 24 hour clocks", () => {
    expect(time12ToTime24("04:30 PM")).toBe("16:30");
    expect(time24ToTime12("00:15")).toBe("12:15 AM");
    expect(time24ToTime12("24:00")).toBeNull();
  });
});

describe("durationInMins", () => {
  it("is a string", () => {
    expect(durationInMins("08:00 AM", "10:00 AM")).toBe("120");
    expect(durationInMins("04:30 PM", "05:00 PM")).toBe("30");
  });

  it("is null when the end is not after the start", () => {
    expect(durationInMins("10:00 AM", "10:00 AM")).toBeNull();
    expect(durationInMins("10:00 AM", "09:00 AM")).toBeNull();
    expect(durationInMins("bad", "09:00 AM")).toBeNull();
  });
});

describe("event datetimes", () => {
  it("parses and formats the eventDetails format", () => {
    const parts = parseDateTime("2025-11-16 08:00:00.000");
    expect(parts).toEqual({ date: "2025-11-16", time24: "08:00", seconds: "00", millis: "000" });
    expect(formatDateTime(parts!.date, parts!.time24, parts!.seconds, parts!.millis)).toBe(
      "2025-11-16 08:00:00.000",
    );
  });

  it("rejects ISO strings", () => {
    expect(parseDateTime("2025-11-16T08:00:00.000Z")).toBeNull();
  });

  it("interprets datetimes in IST", () => {
    expect(dateTimeToEpoch("2025-11-16 08:00:00.000")).toBe(Date.UTC(2025, 10, 16, 2, 30));
  });

  it("validates calendar dates", () => {
    expect(isValidDate("2024-02-29")).toBe(true);
    expect(isValidDate("2025-02-29")).toBe(false);
    expect(isValidDate("2025-13-01")).toBe(false);
  });
});
