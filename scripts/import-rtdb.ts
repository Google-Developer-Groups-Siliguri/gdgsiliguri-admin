import "./lib/load-env";

import { importFromRtdb } from "../src/lib/content/import";

import { parseArgs } from "./lib/args";
import { assertTargetAllowed, fail } from "./lib/target";

async function main() {
  const args = parseArgs(process.argv.slice(2));
  assertTargetAllowed(args);
  const outcomes = await importFromRtdb({ force: args.get("force") === true });
  for (const outcome of outcomes) {
    console.log(`${outcome.result.padEnd(8)} ${outcome.key.padEnd(18)} ${outcome.detail}`);
  }
  process.exit(0);
}

main().catch((error: unknown) => fail((error as Error).message));
