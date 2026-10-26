import "./lib/load-env";

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { importFromRtdb } from "../src/lib/content/import";
import { adminDatabaseFor, adminFirestoreFor } from "../src/lib/firebase/admin-app";
import { useEmulators } from "../src/lib/firebase/config";

import { parseArgs } from "./lib/args";
import { restoreFirestore, type FirestoreDump } from "./lib/firestore-dump";
import { fail } from "./lib/target";

const SEED_FILE = new URL("../seed/rtdb-export.json", import.meta.url).pathname;

function readJson(path: string): unknown {
  return JSON.parse(readFileSync(resolve(path), "utf8"));
}

async function main() {
  if (!useEmulators) fail("seed:emulator only runs against the emulators. Set NEXT_PUBLIC_USE_EMULATORS=true.");
  const args = parseArgs(process.argv.slice(2));
  const rtdbFile = typeof args.get("rtdb") === "string" ? (args.get("rtdb") as string) : SEED_FILE;
  const firestoreFile = args.get("firestore");

  await adminDatabaseFor().ref().set(readJson(rtdbFile));
  console.log(`Loaded ${rtdbFile} into the Realtime Database emulator`);

  if (typeof firestoreFile === "string") {
    const count = await restoreFirestore(adminFirestoreFor(), readJson(firestoreFile) as FirestoreDump);
    console.log(`Restored ${count} Firestore documents from ${firestoreFile}`);
    process.exit(0);
  }

  const outcomes = await importFromRtdb({ force: args.get("keep-content") !== true });
  for (const outcome of outcomes) {
    console.log(`${outcome.result.padEnd(8)} ${outcome.key.padEnd(18)} ${outcome.detail}`);
  }
  process.exit(0);
}

main().catch((error: unknown) => fail((error as Error).message));
