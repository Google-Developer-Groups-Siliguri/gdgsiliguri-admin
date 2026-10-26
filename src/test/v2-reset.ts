import { applyMigration, planMigration } from "@/lib/cms/migrate";
import { backfill, seed } from "@/lib/cms/test-data";
import { adminDatabaseFor, adminFirestoreFor } from "@/lib/firebase/admin-app";
import { EMULATOR_PORTS, EMULATOR_PROJECT_ID, emulatorFirestoreDatabaseId } from "@/lib/firebase/config";

export const migrationActor = { email: "migrate:v2 script" };

export async function clearFirestore(): Promise<void> {
  if (process.env.EMULATOR_NAMESPACE !== "integration") {
    throw new Error("Refusing to reset: integration tests must run in the integration namespace.");
  }
  const url = `http://127.0.0.1:${EMULATOR_PORTS.firestore}/emulator/v1/projects/${EMULATOR_PROJECT_ID}/databases/${emulatorFirestoreDatabaseId()}/documents`;
  const response = await fetch(url, { method: "DELETE" });
  if (!response.ok) throw new Error(`Could not clear the Firestore emulator: ${response.status}`);
}

export async function resetV2Data(): Promise<void> {
  await clearFirestore();
  await adminDatabaseFor().ref().set(structuredClone(seed));
  await applyMigration(adminFirestoreFor(), planMigration(backfill()), {
    actor: migrationActor,
    note: "Migrated from RTDB (test)",
  });
}

export async function rtdbValue(path: string): Promise<unknown> {
  return (await adminDatabaseFor().ref(path).get()).val();
}

export async function firestoreDoc<T = Record<string, unknown>>(path: string): Promise<T | null> {
  const snapshot = await adminFirestoreFor().doc(path).get();
  return snapshot.exists ? (snapshot.data() as T) : null;
}
