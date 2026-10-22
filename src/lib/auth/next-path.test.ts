import { describe, expect, it } from "vitest";

import { safeNextPath } from "./next-path";

describe("safeNextPath", () => {
  it("keeps in-app paths", () => {
    expect(safeNextPath("/devfest/schedule?tab=1")).toBe("/devfest/schedule?tab=1");
  });

  it("falls back to the dashboard for anything that could leave the app or loop", () => {
    for (const value of [null, "", "https://evil.example", "//evil.example", "/\\evil", "/login", "/api/session"]) {
      expect(safeNextPath(value)).toBe("/");
    }
  });
});
