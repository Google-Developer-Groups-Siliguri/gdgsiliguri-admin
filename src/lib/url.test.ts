import { describe, expect, it } from "vitest";

import { isHttpsUrl, suggestUrlFix } from "./url";

describe("isHttpsUrl", () => {
  it("accepts absolute https URLs", () => {
    expect(isHttpsUrl("https://ik.imagekit.io/gdgsiliguri1/teams/a.png")).toBe(true);
  });

  it("rejects http, relative and schemeless values", () => {
    for (const value of ["http://x.com", "/teams/a.png", "Twitter.com/debuisalive", "https://", ""]) {
      expect(isHttpsUrl(value)).toBe(false);
    }
  });
});

describe("suggestUrlFix", () => {
  it("adds https to schemeless URLs", () => {
    expect(suggestUrlFix("Twitter.com/debuisalive")).toBe("https://Twitter.com/debuisalive");
  });

  it("upgrades http to https", () => {
    expect(suggestUrlFix("http://linkedin.com/in/x")).toBe("https://linkedin.com/in/x");
  });

  it("trims surrounding whitespace", () => {
    expect(suggestUrlFix("https://linkedin.com/in/x ")).toBe("https://linkedin.com/in/x");
  });

  it("returns null when nothing needs fixing or nothing can be fixed", () => {
    expect(suggestUrlFix("https://x.com")).toBeNull();
    expect(suggestUrlFix("")).toBeNull();
    expect(suggestUrlFix("not a url")).toBeNull();
  });
});
