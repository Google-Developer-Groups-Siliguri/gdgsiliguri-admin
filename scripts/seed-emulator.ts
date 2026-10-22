import "./lib/load-env";

import { readFileSync } from "node:fs";

import { importFromRtdb } from "../src/lib/content/import";
import { adminDatabaseFor } from "../src/lib/firebase/admin-app";
import { useEmulators } from "../src/lib/firebase/config";

import { parseArgs } from "./lib/args";
import { fail } from "./lib/target";

const SEED_FILE = new URL("../seed/rtdb-export.json", import.meta.url);

async function main() {
  if (!useEmulators) fail("seed:emulator only runs against the emulators. Set NEXT_PUBLIC_USE_EMULATORS=true.");
  const args = parseArgs(process.argv.slice(2));
  const seed = JSON.parse(readFileSync(SEED_FILE, "utf8"));
  await adminDatabaseFor().ref().set(seed);
  console.log("Loaded seed/rtdb-export.json into the Realtime Database emulator");
  const outcomes = await importFromRtdb({ force: args.get("keep-content") !== true });
  for (const outcome of outcomes) {
    console.log(`${outcome.result.padEnd(8)} ${outcome.key.padEnd(18)} ${outcome.detail}`);
  }
  process.exit(0);
}

main().catch((error: unknown) => fail((error as Error).message));
