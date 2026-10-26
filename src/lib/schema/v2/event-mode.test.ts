import { describe, expect, it } from "vitest";

import { isEventMode } from "./event-mode";

const edition = { startAt: "2026-11-14T02:30:00.000Z", endAt: "2026-11-14T12:00:00.000Z" };
const at = (iso: string) => Date.parse(iso);

describe("isEventMode", () => {
  it("follows on and off", () => {
    expect(isEventMode({ eventMode: "on" }, edition, at("2020-01-01T00:00:00Z"))).toBe(true);
    expect(isEventMode({ eventMode: "off" }, edition, at("2026-11-14T05:00:00Z"))).toBe(false);
  });

  it("is on all the way up to a day after the event when auto has no lead days", () => {
    expect(isEventMode({ eventMode: "auto" }, edition, at("2026-01-01T00:00:00Z"))).toBe(true);
    expect(isEventMode({ eventMode: "auto" }, edition, at("2026-11-15T11:59:00Z"))).toBe(true);
    expect(isEventMode({ eventMode: "auto" }, edition, at("2026-11-15T12:00:00Z"))).toBe(false);
  });

  it("starts the lead days before the event", () => {
    const site = { eventMode: "auto" as const, eventModeLeadDays: 30 };
    expect(isEventMode(site, edition, at("2026-10-14T02:29:00Z"))).toBe(false);
    expect(isEventMode(site, edition, at("2026-10-15T02:30:00Z"))).toBe(true);
  });

  it("is off in auto mode without an edition", () => {
    expect(isEventMode({ eventMode: "auto" }, null)).toBe(false);
  });
});
