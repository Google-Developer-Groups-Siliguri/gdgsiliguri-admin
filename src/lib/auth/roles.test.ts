import { describe, expect, it } from "vitest";

import { hasRole, isRole, normalizeEmail } from "./roles";

describe("roles", () => {
  it("lets owners do everything editors can", () => {
    expect(hasRole({ role: "owner" }, "editor")).toBe(true);
    expect(hasRole({ role: "owner" }, "owner")).toBe(true);
  });

  it("keeps editors out of owner-only actions", () => {
    expect(hasRole({ role: "editor" }, "editor")).toBe(true);
    expect(hasRole({ role: "editor" }, "owner")).toBe(false);
  });

  it("recognises only known roles", () => {
    expect(isRole("owner")).toBe(true);
    expect(isRole("admin")).toBe(false);
    expect(isRole(undefined)).toBe(false);
  });

  it("normalizes emails for document ids", () => {
    expect(normalizeEmail("  Mallick.Debajit3@Gmail.com ")).toBe("mallick.debajit3@gmail.com");
  });
});
