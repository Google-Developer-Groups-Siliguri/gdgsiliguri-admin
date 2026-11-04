import { describe, expect, it } from "vitest";

import { deepEqual } from "./deep-equal";

describe("deepEqual", () => {
  it("ignores key order", () => {
    expect(deepEqual({ a: 1, b: { c: [1, 2] } }, { b: { c: [1, 2] }, a: 1 })).toBe(true);
  });

  it("respects array order, which is display order", () => {
    expect(deepEqual([1, 2], [2, 1])).toBe(false);
  });

  it("treats undefined properties as missing", () => {
    expect(deepEqual({ a: 1, b: undefined }, { a: 1 })).toBe(true);
  });

  it("treats empty objects and objects whose fields are all undefined as missing", () => {
    expect(deepEqual({ a: 1, recap: { attendees: undefined, photos: { url: undefined } } }, { a: 1 })).toBe(true);
    expect(deepEqual({ a: 1, recap: {} }, { a: 1 })).toBe(true);
    expect(deepEqual({ a: 1, recap: { attendees: 0 } }, { a: 1 })).toBe(false);
  });

  it("tells empty strings from missing values", () => {
    expect(deepEqual({ a: "" }, {})).toBe(false);
    expect(deepEqual(null, {})).toBe(false);
  });
});
