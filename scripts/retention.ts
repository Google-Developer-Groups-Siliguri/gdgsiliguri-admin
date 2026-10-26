import "./lib/load-env";

import { pruneAllRevisions, pruneContacts } from "../src/lib/cms/retention";

import { parseArgs } from "./lib/args";
import { assertTargetAllowed, fail } from "./lib/target";

async function main() {
  const args = parseArgs(process.argv.slice(2));
  assertTargetAllowed(args);
  const contacts = await pruneContacts();
  const revisions = await pruneAllRevisions();
  console.log(`Removed contact details from ${contacts} submission(s) and ${revisions} old revision(s).`);
  process.exit(0);
}

main().catch((error: unknown) => fail((error as Error).message));
