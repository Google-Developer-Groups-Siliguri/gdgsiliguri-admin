import { describe, expect, it } from "vitest";

import { isSameOrigin } from "./same-origin";

function request(headers: Record<string, string>) {
  return new Request("http://localhost:3100/api/session", { method: "POST", headers });
}

describe("isSameOrigin", () => {
  it("accepts requests from the app's own origin", () => {
    expect(isSameOrigin(request({ origin: "http://localhost:3100", host: "localhost:3100" }))).toBe(
      true,
    );
  });

  it("honours the forwarded host behind a proxy", () => {
    expect(
      isSameOrigin(
        request({
          origin: "https://admin.gdgsiliguri.com",
          host: "internal:8080",
          "x-forwarded-host": "admin.gdgsiliguri.com",
        }),
      ),
    ).toBe(true);
  });

  it("rejects other origins and missing origins", () => {
    expect(isSameOrigin(request({ origin: "https://evil.example", host: "localhost:3100" }))).toBe(
      false,
    );
    expect(isSameOrigin(request({ host: "localhost:3100" }))).toBe(false);
  });
});
