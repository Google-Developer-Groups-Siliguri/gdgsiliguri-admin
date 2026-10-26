import "./lib/load-env";

import { mkdirSync, writeFileSync } from "node:fs";

import { adminDatabaseFor, adminFirestoreFor } from "../src/lib/firebase/admin-app";

import { parseArgs } from "./lib/args";
import { dumpFirestore } from "./lib/firestore-dump";
import { assertTargetAllowed, fail } from "./lib/target";

const BACKUP_DIR = new URL("../backups/", import.meta.url);

export async function runBackup(label = new Date().toISOString().replace(/[:.]/g, "-")) {
  mkdirSync(BACKUP_DIR, { recursive: true });
  const rtdbFile = new URL(`rtdb-${label}.json`, BACKUP_DIR);
  const firestoreFile = new URL(`firestore-${label}.json`, BACKUP_DIR);
  const rtdb = (await adminDatabaseFor().ref("/").get()).val() ?? {};
  writeFileSync(rtdbFile, `${JSON.stringify(rtdb, null, 2)}\n`);
  const firestore = await dumpFirestore(adminFirestoreFor());
  writeFileSync(firestoreFile, `${JSON.stringify(firestore, null, 2)}\n`);
  return { rtdbFile: rtdbFile.pathname, firestoreFile: firestoreFile.pathname, docs: Object.keys(firestore).length };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  assertTargetAllowed(args);
  const result = await runBackup();
  console.log(`RTDB      → ${result.rtdbFile}`);
  console.log(`Firestore → ${result.firestoreFile} (${result.docs} documents)`);
  process.exit(0);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error: unknown) => fail((error as Error).message));
}
