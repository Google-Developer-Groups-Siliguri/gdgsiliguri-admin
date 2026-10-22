import { describe, expect, it } from "vitest";

import { parseArgs } from "./args";

describe("parseArgs", () => {
  it("reads values, inline values and flags", () => {
    const args = parseArgs(["--email", "a@b.com", "--role=owner", "--production"]);
    expect(args.get("email")).toBe("a@b.com");
    expect(args.get("role")).toBe("owner");
    expect(args.get("production")).toBe(true);
  });
});
