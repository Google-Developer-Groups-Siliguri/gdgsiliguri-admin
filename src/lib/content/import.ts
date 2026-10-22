import { FieldValue } from "firebase-admin/firestore";

import { adminDatabaseFor, adminFirestoreFor } from "@/lib/firebase/admin-app";

import { parseSection, SECTION_KEYS, SECTIONS, type SectionKey } from "./sections";

export type ImportOutcome = { key: SectionKey; result: "created" | "replaced" | "skipped" | "missing"; detail: string };

const EMPTY_EVENTS = { enabled: false, data: [] };
const IMPORT_ACTOR = "import:rtdb script";

export async function importFromRtdb({ force = false } = {}): Promise<ImportOutcome[]> {
  const firestore = adminFirestoreFor();
  const database = adminDatabaseFor();
  const outcomes: ImportOutcome[] = [];

  for (const key of SECTION_KEYS) {
    const { rtdbPath, label } = SECTIONS[key];
    const ref = firestore.collection("content").doc(key);
    const existing = await ref.get();
    if (existing.exists && !force) {
      outcomes.push({ key, result: "skipped", detail: "already in Firestore (use --force to replace)" });
      continue;
    }

    const raw = (await database.ref(rtdbPath).get()).val();
    if (raw === null && key !== "events") {
      outcomes.push({ key, result: "missing", detail: `nothing at /${rtdbPath} in the Realtime Database` });
      continue;
    }
    const value = parseSection(key, raw ?? EMPTY_EVENTS);

    const batch = firestore.batch();
    batch.set(ref, {
      rtdbPath,
      draft: value,
      published: value,
      version: 1,
      draftUpdatedAt: FieldValue.serverTimestamp(),
      draftUpdatedBy: IMPORT_ACTOR,
      publishedAt: FieldValue.serverTimestamp(),
      publishedBy: IMPORT_ACTOR,
    });
    batch.set(ref.collection("revisions").doc(), {
      data: value,
      version: 1,
      publishedAt: FieldValue.serverTimestamp(),
      publishedBy: IMPORT_ACTOR,
      note: raw === null ? "Created empty; not in the Realtime Database yet" : `Imported from /${rtdbPath}`,
    });
    await batch.commit();
    outcomes.push({
      key,
      result: existing.exists ? "replaced" : "created",
      detail: raw === null ? `${label}: created disabled and empty (Firestore only)` : `${label}: imported from /${rtdbPath}`,
    });
  }
  return outcomes;
}
