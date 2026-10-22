import { readFileSync } from "node:fs";

import { importFromRtdb } from "@/lib/content/import";
import { adminDatabaseFor } from "@/lib/firebase/admin-app";
import { EMULATOR_PORTS, EMULATOR_PROJECT_ID, emulatorFirestoreDatabaseId } from "@/lib/firebase/config";

export const seed = JSON.parse(
  readFileSync(new URL("../../seed/rtdb-export.json", import.meta.url), "utf8"),
) as Record<string, unknown>;

export async function resetEmulatorData(): Promise<void> {
  if (process.env.EMULATOR_NAMESPACE !== "integration") {
    throw new Error("Refusing to reset: integration tests must run in the integration namespace.");
  }
  const url = `http://127.0.0.1:${EMULATOR_PORTS.firestore}/emulator/v1/projects/${EMULATOR_PROJECT_ID}/databases/${emulatorFirestoreDatabaseId()}/documents`;
  const response = await fetch(url, { method: "DELETE" });
  if (!response.ok) throw new Error(`Could not clear the Firestore emulator: ${response.status}`);
  await adminDatabaseFor().ref().set(structuredClone(seed));
  await importFromRtdb();
}

export async function rtdbRoot(): Promise<Record<string, unknown>> {
  return (await adminDatabaseFor().ref().get()).val();
}
