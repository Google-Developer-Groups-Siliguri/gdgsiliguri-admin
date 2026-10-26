import { describe, expect, it } from "vitest";

import { autoId, slugify, uniqueSlug } from "./slug";

describe("slugify", () => {
  it.each([
    ["Satish VJ", "satish-vj"],
    ["Computer Engineers' Society, SIT", "computer-engineers-society-sit"],
    ["  Débâjit   Mallick ", "debajit-mallick"],
    ["Supercharge App Dev with Gen AI - Utilery", "supercharge-app-dev-with-gen-ai-utilery"],
    ["!!!", ""],
  ])("%s → %s", (name, slug) => {
    expect(slugify(name)).toBe(slug);
  });

  it("caps at 60 characters without a trailing hyphen", () => {
    const slug = slugify(`${"a".repeat(59)} bcd`);
    expect(slug.length).toBeLessThanOrEqual(60);
    expect(slug.endsWith("-")).toBe(false);
  });
});

describe("uniqueSlug", () => {
  it("adds -2, -3 on collision", () => {
    expect(uniqueSlug("Panel Discussion", [])).toBe("panel-discussion");
    expect(uniqueSlug("Panel Discussion", ["panel-discussion"])).toBe("panel-discussion-2");
    expect(uniqueSlug("Panel Discussion", ["panel-discussion", "panel-discussion-2"])).toBe("panel-discussion-3");
    expect(uniqueSlug("!!!", [])).toBe("item");
  });
});

describe("autoId", () => {
  it("makes 20-character ids", () => {
    expect(autoId()).toMatch(/^[A-Za-z0-9]{20}$/);
    expect(autoId()).not.toBe(autoId());
  });
});
