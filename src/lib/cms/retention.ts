import "server-only";

import type { Timestamp } from "firebase-admin/firestore";

import { revisionsRef } from "./paths";
import { db } from "./repository";

export const KEEP_REVISIONS = 50;
export const KEEP_REVISION_DAYS = 90;

export async function pruneRevisions(sectionId: string, now = Date.now()): Promise<number> {
  const cutoff = now - KEEP_REVISION_DAYS * 24 * 3600_000;
  const snapshot = await revisionsRef(db(), sectionId).orderBy("version", "desc").offset(KEEP_REVISIONS).get();
  const stale = snapshot.docs.filter((doc) => {
    const at = doc.get("publishedAt") as Timestamp | undefined;
    return at !== undefined && at.toMillis() < cutoff;
  });
  if (stale.length === 0) return 0;
  const batch = db().batch();
  for (const doc of stale) batch.delete(doc.ref);
  await batch.commit();
  return stale.length;
}
