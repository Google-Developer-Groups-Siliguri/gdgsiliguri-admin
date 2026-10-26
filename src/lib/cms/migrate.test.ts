import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { DEFAULT_FROM_RTDB_OPTIONS, fromRtdb } from "@/lib/legacy/from-rtdb";

import { planMigration, validateMigration } from "./migrate";

const root = JSON.parse(readFileSync("seed/rtdb-export.uncleaned.json", "utf8"));

function issuesFor(storeUrls: { android: string; ios?: string }) {
  const data = fromRtdb(root, {
    ...DEFAULT_FROM_RTDB_OPTIONS,
    appSettings: { latestBuild: 4000, storeUrls },
  });
  return validateMigration(planMigration(data)).map((issue) => issue.path.join("."));
}

describe("validateMigration", () => {
  it("accepts app settings without an App Store link", () => {
    expect(
      issuesFor({
        android: "https://play.google.com/store/apps/details?id=com.example",
      }),
    ).toEqual([]);
  });

  it("still rejects an App Store link that isn't https", () => {
    expect(
      issuesFor({
        android: "https://play.google.com/store/apps/details?id=com.example",
        ios: "apps.apple.com/app",
      }),
    ).toContain("site-app.storeUrls.ios");
  });
});
