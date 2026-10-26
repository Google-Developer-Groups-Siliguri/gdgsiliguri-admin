import { execFileSync } from "node:child_process";

import { clearFirestore, E2E_NAMESPACE, FIRESTORE, putAdmin, TEST_USERS } from "./support/emulator";
import { assertEmulatorTarget } from "./support/guard";

export default async function globalSetup() {
  assertEmulatorTarget();
  const reachable = await fetch(FIRESTORE).then(
    () => true,
    () => false,
  );
  if (!reachable) {
    throw new Error("Firebase emulators are not running. Start them with `npm run emulators`.");
  }
  await clearFirestore();
  execFileSync("npx", ["tsx", "scripts/seed-emulator.ts"], {
    stdio: "ignore",
    env: { ...process.env, NEXT_PUBLIC_USE_EMULATORS: "true", EMULATOR_NAMESPACE: E2E_NAMESPACE },
  });
  await putAdmin(TEST_USERS.owner.email, "owner");
  await putAdmin(TEST_USERS.editor.email, "editor");
}
