import "server-only";

import { FieldValue, type Timestamp } from "firebase-admin/firestore";

import { revisionsRef, sectionsRef, submissionsRef } from "./paths";
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

export const KEEP_CONTACT_DAYS = 60;

export async function pruneContacts(now = Date.now()): Promise<number> {
  const firestore = db();
  const editions = await firestore.collection("editions").get();
  const endOf = new Map(
    editions.docs.map((doc) => [Number(doc.id), (doc.get("endAt") as Timestamp | undefined)?.toMillis()]),
  );
  const snapshot = await submissionsRef(firestore).get();
  const stale = snapshot.docs.filter((doc) => {
    if (!doc.get("contact")) return false;
    const end = endOf.get(Number(doc.get("payload.edition")));
    return end !== undefined && now - end > KEEP_CONTACT_DAYS * 24 * 3600_000;
  });
  for (let start = 0; start < stale.length; start += 450) {
    const batch = firestore.batch();
    for (const doc of stale.slice(start, start + 450)) batch.update(doc.ref, { contact: FieldValue.delete() });
    await batch.commit();
  }
  return stale.length;
}

export async function pruneAllRevisions(now = Date.now()): Promise<number> {
  const sections = await sectionsRef(db()).get();
  let removed = 0;
  for (const doc of sections.docs) removed += await pruneRevisions(doc.id, now);
  return removed;
}
