import "./lib/load-env";

import { applyKnownFixes } from "../src/lib/content/known-fixes";

import { parseArgs } from "./lib/args";
import { patchLegacySections, printPatch } from "./lib/legacy-patch";
import { assertTargetAllowed, fail } from "./lib/target";

async function main() {
  const args = parseArgs(process.argv.slice(2));
  assertTargetAllowed(args);
  const apply = args.get("apply") === true;
  const patch = await patchLegacySections(applyKnownFixes, {
    apply,
    actor: { email: "fix-content script" },
    note: "Fixed known content bugs before the Firestore migration",
  });
  printPatch(patch, apply);
  process.exit(patch.outcomes.some((outcome) => outcome.status === "skipped") ? 2 : 0);
}

main().catch((error: unknown) => fail((error as Error).message));
