import "./lib/load-env";

import { syncLegacy } from "../src/lib/cms/sync";

import { parseArgs } from "./lib/args";
import { assertTargetAllowed, fail } from "./lib/target";

async function main() {
  const args = parseArgs(process.argv.slice(2));
  assertTargetAllowed(args);
  const result = await syncLegacy(args.get("pending") === true ? "pending" : "all", { email: "sync:legacy script" });
  if (result.skipped) fail("LEGACY_RTDB_SYNC is false, so nothing was written.");
  console.log(`Synced: ${result.synced.map((node) => `/${node}`).join(", ") || "nothing"}`);
  for (const node of result.drift)
    console.log(`Overwrote a manual edit at /${node} (saved in cms/root/sync/legacyRtdb/drift)`);
  for (const { path, error } of result.failed) console.error(`Failed /${path}: ${error}`);
  process.exit(result.failed.length ? 1 : 0);
}

main().catch((error: unknown) => fail((error as Error).message));
