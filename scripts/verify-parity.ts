import "./lib/load-env";

import { adminDatabaseFor, adminFirestoreFor } from "../src/lib/firebase/admin-app";
import { formatParity } from "../src/lib/legacy/parity";
import { verifyParity } from "../src/lib/legacy/verify";

import { parseArgs } from "./lib/args";
import { assertTargetAllowed, fail } from "./lib/target";

async function main() {
  const args = parseArgs(process.argv.slice(2));
  assertTargetAllowed(args);
  const results = await verifyParity(adminFirestoreFor(), adminDatabaseFor(), {
    normalize: args.get("strict-urls") !== true,
  });
  console.log(args.get("json") === true ? JSON.stringify(results, null, 2) : formatParity(results));
  const unexpected = results.reduce((total, result) => total + result.unexpected.length, 0);
  if (unexpected) fail(`${unexpected} difference(s) are not on the allow-list (scripts/parity-allowlist.json).`);
  console.log("Parity OK: only allow-listed differences.");
  process.exit(0);
}

main().catch((error: unknown) => fail((error as Error).message));
