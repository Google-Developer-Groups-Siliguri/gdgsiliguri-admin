import type { CollectionReference, DocumentReference, Firestore } from "firebase-admin/firestore";

import { fromExampleJson, toExampleJson } from "./example-json";

export type FirestoreDump = Record<string, Record<string, unknown>>;

async function dumpCollection(collection: CollectionReference, into: FirestoreDump): Promise<void> {
  for (const ref of await collection.listDocuments()) await dumpDocument(ref, into);
}

async function dumpDocument(ref: DocumentReference, into: FirestoreDump): Promise<void> {
  const snapshot = await ref.get();
  if (snapshot.exists) into[ref.path] = toExampleJson(snapshot.data()) as Record<string, unknown>;
  for (const child of await ref.listCollections()) await dumpCollection(child, into);
}

export async function dumpFirestore(firestore: Firestore): Promise<FirestoreDump> {
  const dump: FirestoreDump = {};
  for (const collection of await firestore.listCollections()) await dumpCollection(collection, dump);
  return Object.fromEntries(Object.entries(dump).sort(([a], [b]) => a.localeCompare(b)));
}

const BATCH_SIZE = 450;

export async function restoreFirestore(firestore: Firestore, dump: FirestoreDump): Promise<number> {
  const entries = Object.entries(dump);
  for (let start = 0; start < entries.length; start += BATCH_SIZE) {
    const batch = firestore.batch();
    for (const [path, data] of entries.slice(start, start + BATCH_SIZE)) {
      batch.set(firestore.doc(path), fromExampleJson(data) as Record<string, unknown>);
    }
    await batch.commit();
  }
  return entries.length;
}
