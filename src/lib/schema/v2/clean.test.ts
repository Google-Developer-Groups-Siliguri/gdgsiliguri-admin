import { describe, expect, it } from "vitest";

import { mergeSubmitted } from "./clean";

type Speaker = { id: string; name: string; trackId?: string; headline?: string; updatedAt?: string; order?: number };

const item: Speaker = { id: "ada", name: "Ada", trackId: "cloud", headline: "Engineer", updatedAt: "x", order: 10 };

describe("mergeSubmitted", () => {
  it("removes a field the form cleared", () => {
    const merged = mergeSubmitted(item, { ...item, trackId: "" }, { id: "ada", name: "Ada", headline: "Engineer" });
    expect(merged).not.toHaveProperty("trackId");
    expect(merged.headline).toBe("Engineer");
  });

  it("removes a field the form set to undefined", () => {
    const merged = mergeSubmitted(item, { ...item, headline: undefined }, { id: "ada", name: "Ada", trackId: "cloud" });
    expect(merged).not.toHaveProperty("headline");
  });

  it("keeps fields the form doesn't validate", () => {
    const merged = mergeSubmitted(item, item, { id: "ada", name: "Ada" });
    expect(merged).toMatchObject({ updatedAt: "x", order: 10, trackId: "cloud" });
  });

  it("lets validated values win, including a changed track", () => {
    const merged = mergeSubmitted(item, { ...item, trackId: "web" }, { id: "ada", name: "Ada", trackId: "web" });
    expect(merged.trackId).toBe("web");
  });

  it("keeps a new item's empty id", () => {
    const blank: Speaker = { id: "", name: "" };
    expect(mergeSubmitted(blank, { ...blank, name: "Ada" }, { id: "", name: "Ada" })).toEqual({ id: "", name: "Ada" });
  });
});
