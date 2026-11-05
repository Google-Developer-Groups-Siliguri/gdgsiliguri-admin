import { describe, expect, it } from "vitest";

import { displayStatus, failureReason } from "./notification-fields";
import { notificationInputSchema } from "./notifications";

const valid = { title: "Doors open at 8", body: "Bring your ticket QR.", ttlSeconds: 3600 };

describe("notificationInputSchema", () => {
  it("trims and defaults the expiry to one day", () => {
    expect(notificationInputSchema.parse({ title: "  Hi  ", body: "  There " })).toEqual({
      title: "Hi",
      body: "There",
      ttlSeconds: 86400,
    });
  });

  it("enforces the length limits after trimming", () => {
    expect(notificationInputSchema.safeParse({ ...valid, title: "a".repeat(65) }).success).toBe(true);
    expect(notificationInputSchema.safeParse({ ...valid, title: "a".repeat(66) }).success).toBe(false);
    expect(notificationInputSchema.safeParse({ ...valid, title: `  ${"a".repeat(65)}  ` }).success).toBe(true);
    expect(notificationInputSchema.safeParse({ ...valid, body: "b".repeat(240) }).success).toBe(true);
    expect(notificationInputSchema.safeParse({ ...valid, body: "b".repeat(241) }).success).toBe(false);
    expect(notificationInputSchema.safeParse({ ...valid, title: "   " }).success).toBe(false);
    expect(notificationInputSchema.safeParse({ ...valid, body: "" }).success).toBe(false);
  });

  it("keeps the title on one line", () => {
    expect(notificationInputSchema.safeParse({ ...valid, title: "One\nTwo" }).success).toBe(false);
    expect(notificationInputSchema.safeParse({ ...valid, title: "One\u2028Two" }).success).toBe(false);
    expect(notificationInputSchema.safeParse({ ...valid, body: "One\nTwo" }).success).toBe(true);
  });

  it("only allows the three expiry options", () => {
    for (const ttlSeconds of [3600, 86400, 259200]) {
      expect(notificationInputSchema.safeParse({ ...valid, ttlSeconds }).success).toBe(true);
    }
    expect(notificationInputSchema.safeParse({ ...valid, ttlSeconds: 60 }).success).toBe(false);
    expect(notificationInputSchema.safeParse({ ...valid, ttlSeconds: "3600" }).success).toBe(false);
  });

  it("rejects unknown keys such as a topic, image or link", () => {
    for (const extra of [{ topic: "all" }, { imageUrl: "https://x.test/a.png" }, { link: "/agenda" }, { data: {} }]) {
      expect(notificationInputSchema.safeParse({ ...valid, ...extra }).success).toBe(false);
    }
  });
});

describe("displayStatus", () => {
  const now = Date.UTC(2026, 10, 14, 3, 0, 0);
  it("flags a send stuck for over five minutes as unknown", () => {
    expect(displayStatus("sending", new Date(now - 4 * 60_000).toISOString(), now)).toBe("sending");
    expect(displayStatus("sending", new Date(now - 6 * 60_000).toISOString(), now)).toBe("unknown");
    expect(displayStatus("sending", null, now)).toBe("unknown");
    expect(displayStatus("sent", new Date(now - 60 * 60_000).toISOString(), now)).toBe("sent");
  });
});

describe("failureReason", () => {
  it("explains known codes and names unknown ones", () => {
    expect(failureReason("messaging/third-party-auth-error")).toMatch(/APNs/);
    expect(failureReason("messaging/something-new")).toContain("messaging/something-new");
  });
});
