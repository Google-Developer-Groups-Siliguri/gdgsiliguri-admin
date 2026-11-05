import { describe, expect, it, vi } from "vitest";

import { ContentError } from "@/lib/cms/errors";

import { buildPushMessage, currentSendEnvironment, emulatorSender, pickSender } from "./fcm";

const content = { id: "abc123", title: "Doors open at 8", body: "Bring your ticket QR.", ttlSeconds: 86400 as const };
const now = Date.UTC(2026, 10, 14, 2, 30, 0);

describe("buildPushMessage", () => {
  it("builds the exact topic message the app expects", () => {
    expect(buildPushMessage(content, "everyone", now)).toEqual({
      topic: "all",
      notification: { title: "Doors open at 8", body: "Bring your ticket QR." },
      android: { priority: "high", ttl: 86_400_000, notification: { channelId: "announcements" } },
      apns: {
        headers: { "apns-priority": "10", "apns-expiration": String(now / 1000 + 86400) },
        payload: { aps: { sound: "default" } },
      },
      fcmOptions: { analyticsLabel: "announce-abc123" },
    });
  });

  it("sends tests to the debug topic only", () => {
    expect(buildPushMessage(content, "test", now).topic).toBe("debug");
  });

  it("uses milliseconds on Android and absolute unix seconds on iOS", () => {
    const message = buildPushMessage({ ...content, ttlSeconds: 3600 }, "everyone", now + 999);
    expect(message.android?.ttl).toBe(3_600_000);
    expect(message.apns?.headers?.["apns-expiration"]).toBe(String(Math.floor((now + 999) / 1000) + 3600));
  });

  it("never sends images, links, data, icons or colours", () => {
    const message = buildPushMessage(content, "everyone", now);
    expect(message).not.toHaveProperty("data");
    expect(message.notification).not.toHaveProperty("imageUrl");
    expect(message.android?.notification).toEqual({ channelId: "announcements" });
  });
});

describe("sender choice", () => {
  it("prefers the emulator, then the flag", () => {
    expect(currentSendEnvironment(true, "true")).toBe("emulator");
    expect(currentSendEnvironment(true, undefined)).toBe("emulator");
    expect(currentSendEnvironment(false, "true")).toBe("live");
    expect(currentSendEnvironment(false, "false")).toBe("disabled");
    expect(currentSendEnvironment(false, "TRUE")).toBe("disabled");
    expect(currentSendEnvironment(false, undefined)).toBe("disabled");
  });

  it("fakes sends in the emulator without calling the real sender", async () => {
    const real = vi.fn();
    const send = pickSender("emulator", real);
    expect(send).toBe(emulatorSender);
    expect(await send(buildPushMessage(content, "everyone", now))).toMatch(/^emulator\//);
    expect(real).not.toHaveBeenCalled();
  });

  it("refuses to pick a sender when sending is off", () => {
    expect(() => pickSender("disabled", vi.fn())).toThrow(ContentError);
    try {
      pickSender("disabled", vi.fn());
    } catch (error) {
      expect((error as ContentError).code).toBe("sending_disabled");
    }
  });

  it("uses the real sender only when live", () => {
    const real = vi.fn();
    expect(pickSender("live", real)).toBe(real);
  });
});
