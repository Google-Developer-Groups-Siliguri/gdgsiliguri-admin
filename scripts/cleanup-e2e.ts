import "./lib/load-env";

import { removeE2E } from "../src/lib/content/cleanup";
import { imageKitConfig, listImageKitFiles } from "../src/lib/uploads/imagekit";

import { parseArgs } from "./lib/args";
import { patchLegacySections, printPatch } from "./lib/legacy-patch";
import { assertTargetAllowed, fail } from "./lib/target";

async function listE2EImages() {
  const config = imageKitConfig();
  if (!config) {
    console.log("ImageKit keys are not set, so e2e-test images were not listed.");
    return;
  }
  const files = await listImageKitFiles('name : "e2e-test"', config);
  console.log(`${files.length} ImageKit file(s) with e2e-test in the name (delete them by hand in ImageKit):`);
  for (const file of files) console.log(`  ${file.filePath}`);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  assertTargetAllowed(args);
  const apply = args.get("apply") === true;
  const patch = await patchLegacySections(removeE2E, {
    apply,
    actor: { email: "cleanup-e2e script" },
    note: "Removed E2E test content",
  });
  printPatch(patch, apply);
  await listE2EImages();
  process.exit(patch.outcomes.some((outcome) => outcome.status === "skipped") ? 2 : 0);
}

main().catch((error: unknown) => fail((error as Error).message));
