import "./lib/load-env";

import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  applyMigration,
  deleteV2Data,
  existingSections,
  planMigration,
  validateMigration,
} from "../src/lib/cms/migrate";
import { legacySyncRef } from "../src/lib/cms/paths";
import { adminDatabaseFor, adminFirestoreFor } from "../src/lib/firebase/admin-app";
import { useEmulators } from "../src/lib/firebase/config";
import { DEFAULT_FROM_RTDB_OPTIONS, fromRtdb } from "../src/lib/legacy/from-rtdb";
import { migrationReportMarkdown } from "../src/lib/legacy/report";

import { runBackup } from "./backup";
import { parseArgs } from "./lib/args";
import { assertTargetAllowed, fail } from "./lib/target";

const ACTOR = { email: "migrate:v2 script" };
const ANDROID_URL = "https://play.google.com/store/apps/details?id=com.amarjitmallick.gdg_siliguri";

function stringArg(args: Map<string, string | true>, key: string): string | undefined {
  const value = args.get(key);
  return typeof value === "string" ? value : undefined;
}

async function loadRoot(args: Map<string, string | true>): Promise<{ root: Record<string, unknown>; source: string }> {
  const file = stringArg(args, "from-file");
  if (file) return { root: JSON.parse(readFileSync(resolve(file), "utf8")), source: file };
  return { root: (await adminDatabaseFor().ref("/").get()).val() ?? {}, source: "the Realtime Database" };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  assertTargetAllowed(args);
  const apply = args.get("apply") === true;
  const date = new Date().toISOString().slice(0, 10);

  const { root, source } = await loadRoot(args);
  const data = fromRtdb(root, {
    ...DEFAULT_FROM_RTDB_OPTIONS,
    appSettings: {
      latestBuild: Number(stringArg(args, "latest-build") ?? 4000),
      storeUrls: { android: stringArg(args, "android-url") ?? ANDROID_URL, ios: stringArg(args, "ios-url") ?? "" },
    },
  });
  const plan = planMigration(data);
  const issues = validateMigration(plan);

  const reportFile = stringArg(args, "report-file");
  if (reportFile) {
    writeFileSync(resolve(reportFile), migrationReportMarkdown(data, { source, date }));
    console.log(`Report written to ${reportFile}`);
  }
  for (const note of data.report.notes) console.log(`- ${note}`);
  console.log(
    `${plan.sections.length} sections, ${plan.bundles.length} bundles · ` +
      `${data.report.unmatchedSpeakers.length} unmatched speakers · ${data.report.amPmAnomalies.length} AM/PM anomalies · ` +
      `${data.report.cleanedUrls.length} cleaned URLs`,
  );
  for (const entry of data.report.unmatchedSpeakers) console.log(`  unmatched: "${entry.name}" in "${entry.session}"`);

  if (issues.length) {
    for (const issue of issues) console.error(`  ${issue.path.join(".")}: ${issue.message}`);
    if (issues.some((issue) => issue.path.join(".") === "site-app.storeUrls.ios")) {
      console.error("Pass the App Store link with --ios-url https://apps.apple.com/app/id…");
    }
    fail(`${issues.length} problem(s) must be fixed before migrating.`);
  }
  if (!apply) {
    console.log("Dry run. Pass --apply to write.");
    process.exit(0);
  }

  const db = adminFirestoreFor();
  const existing = await existingSections(db);
  if (existing && args.get("force") !== true) {
    fail("cms/root/sections already exists, so the migration has run. Pass --force to back up and replace it.");
  }
  if (existing && !stringArg(args, "from-file") && (await legacySyncRef(db).get()).get("lastSyncedAt")) {
    fail(
      "RTDB has already been regenerated from Firestore, so it no longer holds the original content. " +
        "Pass --from-file with an RTDB export taken before the migration (see backups/).",
    );
  }
  if (!useEmulators || existing) {
    const backup = await runBackup(`pre-migrate-${new Date().toISOString().replace(/[:.]/g, "-")}`);
    console.log(`Backed up to ${backup.firestoreFile}`);
  }
  if (existing) {
    await deleteV2Data(db);
    console.log("Deleted the existing v2 collections.");
  }
  const result = await applyMigration(db, plan, { actor: ACTOR, note: `Migrated from RTDB ${date}` });
  console.log(`Done: ${result.writes} writes. Next: npm run verify:parity, then npm run sync:legacy.`);
  process.exit(0);
}

main().catch((error: unknown) => fail((error as Error).message));
