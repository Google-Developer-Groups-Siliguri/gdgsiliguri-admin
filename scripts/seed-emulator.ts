import "./lib/load-env";

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { applyMigration, planMigration } from "../src/lib/cms/migrate";
import { importFromRtdb } from "../src/lib/content/import";
import { adminDatabaseFor, adminFirestoreFor } from "../src/lib/firebase/admin-app";
import { useEmulators } from "../src/lib/firebase/config";
import { DEFAULT_FROM_RTDB_OPTIONS, fromRtdb } from "../src/lib/legacy/from-rtdb";

import { parseArgs } from "./lib/args";
import { fromExampleJson } from "./lib/example-json";
import { restoreFirestore, type FirestoreDump } from "./lib/firestore-dump";
import { fail } from "./lib/target";

const SEED_FILE = new URL("../seed/rtdb-export.json", import.meta.url).pathname;
const EXAMPLES = new URL("../schema/examples/", import.meta.url);

export const EXAMPLE_PATHS: Record<string, string> = {
  "site-config": "site/config",
  "site-app": "site/app",
  "edition-2026": "editions/2026",
  session: "editions/2026/sessions/supercharge-app-dev-with-gen-ai-utilery-1000",
  speaker: "editions/2026/speakers/satish-vj",
  sponsor: "editions/2026/sponsors/google-for-developers",
  "team-member": "team/debajit-mallick",
  event: "events/build-with-ai-siliguri",
  testimonial: "testimonials/example-testimonial",
  blog: "blogs/getting-started-with-gemini-in-flutter",
  "module-showcase": "modules/project-showcase",
  showcase: "showcase/example-krishimitra",
  "showcase-submission": "cms/root/showcaseSubmissions/example-krishimitra",
  "bundle-home": "bundles/home",
  "bundle-edition-2026": "bundles/edition-2026",
};

export const EMULATOR_APP_SETTINGS = {
  latestBuild: 4000,
  storeUrls: {
    android: "https://play.google.com/store/apps/details?id=com.amarjitmallick.gdg_siliguri",
    ios: "https://apps.apple.com/app/id0000000000",
  },
};

async function loadExamples() {
  const db = adminFirestoreFor();
  const batch = db.batch();
  for (const [name, path] of Object.entries(EXAMPLE_PATHS)) {
    const value = JSON.parse(readFileSync(new URL(`${name}.json`, EXAMPLES), "utf8"));
    batch.set(db.doc(path), fromExampleJson(value) as Record<string, unknown>);
  }
  await batch.commit();
  console.log(`Loaded ${Object.keys(EXAMPLE_PATHS).length} example documents from schema/examples`);
}

async function migrateSeed(root: unknown) {
  const data = fromRtdb(root as Record<string, unknown>, {
    ...DEFAULT_FROM_RTDB_OPTIONS,
    appSettings: EMULATOR_APP_SETTINGS,
  });
  const result = await applyMigration(adminFirestoreFor(), planMigration(data), {
    actor: { email: "seed:emulator script" },
    note: "Migrated from the seed",
  });
  console.log(`Migrated the seed to Firestore v2 (${result.writes} writes)`);
}

function readJson(path: string): unknown {
  return JSON.parse(readFileSync(resolve(path), "utf8"));
}

async function main() {
  if (!useEmulators) fail("seed:emulator only runs against the emulators. Set NEXT_PUBLIC_USE_EMULATORS=true.");
  const args = parseArgs(process.argv.slice(2));
  const rtdbFile = typeof args.get("rtdb") === "string" ? (args.get("rtdb") as string) : SEED_FILE;
  const firestoreFile = args.get("firestore");

  if (args.get("v2") === true) {
    await loadExamples();
    process.exit(0);
  }

  const root = readJson(rtdbFile);
  await adminDatabaseFor().ref().set(root);
  console.log(`Loaded ${rtdbFile} into the Realtime Database emulator`);

  if (args.get("migrate") === true) {
    await migrateSeed(root);
    process.exit(0);
  }

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
