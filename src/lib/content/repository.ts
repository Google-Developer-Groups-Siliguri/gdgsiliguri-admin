import "server-only";

import { randomUUID } from "node:crypto";
import { isDeepStrictEqual } from "node:util";

import {
  FieldValue,
  Timestamp,
  type DocumentReference,
  type Query,
  type Transaction,
} from "firebase-admin/firestore";

import { adminDatabaseFor, adminFirestoreFor } from "@/lib/firebase/admin-app";

import { ContentError, type ContentIssue } from "./errors";
import { normalizeForSave } from "./normalize";
import { toRtdbValue } from "./rtdb-value";
import type { SectionValues } from "./schemas";
import { itemCount, parseSection, SECTIONS, validateForPublish, type SectionKey } from "./sections";

export type Actor = { email: string };

export type AuditAction =
  | "save_draft"
  | "publish"
  | "toggle"
  | "revert"
  | "rebuild"
  | "admin_add"
  | "admin_remove"
  | "admin_role";

type PublishLock = { id: string; by: string; expiresAt: Timestamp };

type ContentDoc = {
  rtdbPath: string;
  draft: unknown;
  published: unknown;
  version: number;
  draftUpdatedAt?: Timestamp;
  draftUpdatedBy?: string;
  publishedAt?: Timestamp;
  publishedBy?: string;
  publishLock?: PublishLock;
};

export type SectionState<K extends SectionKey = SectionKey> = {
  key: K;
  draft: SectionValues[K];
  published: SectionValues[K];
  version: number;
  hasDraftChanges: boolean;
  draftUpdatedAt: string | null;
  draftUpdatedBy: string | null;
  publishedAt: string | null;
  publishedBy: string | null;
};

export type RevisionSummary = {
  id: string;
  version: number;
  publishedAt: string | null;
  publishedBy: string;
  note: string | null;
  itemCount: number | null;
};

export type AuditEntry = {
  id: string;
  at: string | null;
  actorEmail: string;
  action: AuditAction;
  sectionKey: SectionKey | null;
  summary: string;
};

const PUBLISH_LOCK_MS = 60_000;
const FINALIZE_ATTEMPTS = 2;

const firestore = () => adminFirestoreFor();
const contentRef = (key: SectionKey) =>
  firestore().collection("content").doc(key) as DocumentReference<ContentDoc>;
const revisionsRef = (key: SectionKey) => contentRef(key).collection("revisions");
const auditRef = () => firestore().collection("auditLog");

function iso(value: Timestamp | undefined | null): string | null {
  return value ? value.toDate().toISOString() : null;
}

function toState<K extends SectionKey>(key: K, doc: ContentDoc): SectionState<K> {
  const draft = parseSection(key, doc.draft);
  const published = parseSection(key, doc.published);
  return {
    key,
    draft,
    published,
    version: doc.version,
    hasDraftChanges: !isDeepStrictEqual(draft, published),
    draftUpdatedAt: iso(doc.draftUpdatedAt),
    draftUpdatedBy: doc.draftUpdatedBy ?? null,
    publishedAt: iso(doc.publishedAt),
    publishedBy: doc.publishedBy ?? null,
  };
}

function notImported(key: SectionKey): ContentError {
  return new ContentError(
    `${SECTIONS[key].label} has not been imported yet. Run npm run import:rtdb.`,
    "not_imported",
  );
}

function staleVersion(): ContentError {
  return new ContentError("Someone else published this section, so reload.", "stale_version");
}

function auditEntry(actor: Actor, action: AuditAction, summary: string, sectionKey?: SectionKey) {
  return {
    at: FieldValue.serverTimestamp(),
    actorEmail: actor.email,
    action,
    summary,
    ...(sectionKey ? { sectionKey } : {}),
  };
}

export async function writeAudit(
  actor: Actor,
  action: AuditAction,
  summary: string,
  sectionKey?: SectionKey,
): Promise<void> {
  await auditRef().add(auditEntry(actor, action, summary, sectionKey));
}

function describeCount(key: SectionKey, value: unknown): string {
  const count = itemCount(key, value);
  return count === null ? "" : ` (${count} ${count === 1 ? "item" : "items"})`;
}

async function readDoc(key: SectionKey): Promise<ContentDoc> {
  const snapshot = await contentRef(key).get();
  const data = snapshot.data();
  if (!snapshot.exists || !data) throw notImported(key);
  return data;
}

export async function getSection<K extends SectionKey>(key: K): Promise<SectionState<K>> {
  return toState(key, await readDoc(key));
}

export async function getAllSections(): Promise<Partial<Record<SectionKey, SectionState>>> {
  const snapshots = await firestore().collection("content").get();
  const states: Partial<Record<SectionKey, SectionState>> = {};
  for (const snapshot of snapshots.docs) {
    const key = snapshot.id as SectionKey;
    if (key in SECTIONS) states[key] = toState(key, snapshot.data() as ContentDoc);
  }
  return states;
}

export async function saveDraft<K extends SectionKey>(
  key: K,
  draft: unknown,
  actor: Actor,
): Promise<SectionState<K>> {
  const parsed = parseSection(key, normalizeForSave(draft));
  await readDoc(key);
  await contentRef(key).update({
    draft: parsed,
    draftUpdatedAt: FieldValue.serverTimestamp(),
    draftUpdatedBy: actor.email,
  });
  await writeAudit(actor, "save_draft", `Saved a draft of ${SECTIONS[key].label}`, key);
  return getSection(key);
}

export async function discardDraft<K extends SectionKey>(
  key: K,
  actor: Actor,
): Promise<SectionState<K>> {
  const doc = await readDoc(key);
  await contentRef(key).update({
    draft: doc.published,
    draftUpdatedAt: FieldValue.serverTimestamp(),
    draftUpdatedBy: actor.email,
  });
  return getSection(key);
}

type PublishPlan = {
  action: "publish" | "toggle";
  strict: boolean;
  pick: (doc: ContentDoc) => unknown;
  summary: (value: unknown) => string;
  draftChanges?: Record<string, unknown>;
  note?: string;
};

function issuesFrom(error: { issues: { path: PropertyKey[]; message: string }[] }): ContentIssue[] {
  return error.issues.map((issue) => ({
    path: issue.path.filter((part): part is string | number => typeof part !== "symbol"),
    message: issue.message,
  }));
}

async function acquireLock(
  key: SectionKey,
  expectedVersion: number,
  actor: Actor,
  plan: PublishPlan,
  lockId: string,
) {
  return firestore().runTransaction(async (transaction) => {
    const snapshot = await transaction.get(contentRef(key));
    const doc = snapshot.data();
    if (!snapshot.exists || !doc) throw notImported(key);
    if (doc.version !== expectedVersion) throw staleVersion();
    if (doc.publishLock && doc.publishLock.expiresAt.toMillis() > Date.now()) {
      throw new ContentError(
        `${doc.publishLock.by} is publishing this section right now. Try again in a minute.`,
        "publish_in_progress",
      );
    }
    const candidate = plan.pick(doc);
    if (plan.strict) {
      const result = validateForPublish(key, candidate);
      if (!result.success) {
        throw new ContentError("Fix the highlighted problems before publishing.", "invalid", issuesFrom(result.error));
      }
    }
    const value = parseSection(key, candidate);
    const rtdbValue = toRtdbValue(key, value);
    transaction.update(contentRef(key), {
      publishLock: {
        id: lockId,
        by: actor.email,
        expiresAt: Timestamp.fromMillis(Date.now() + PUBLISH_LOCK_MS),
      },
    });
    return { value, rtdbValue, rtdbPath: doc.rtdbPath };
  });
}

async function releaseLock(key: SectionKey, lockId: string): Promise<void> {
  await firestore()
    .runTransaction(async (transaction) => {
      const doc = (await transaction.get(contentRef(key))).data();
      if (doc?.publishLock?.id === lockId) {
        transaction.update(contentRef(key), { publishLock: FieldValue.delete() });
      }
    })
    .catch(() => undefined);
}

function finalize(
  transaction: Transaction,
  key: SectionKey,
  doc: ContentDoc,
  value: unknown,
  actor: Actor,
  plan: PublishPlan,
) {
  const version = doc.version + 1;
  transaction.update(contentRef(key), {
    published: value,
    version,
    publishedAt: FieldValue.serverTimestamp(),
    publishedBy: actor.email,
    publishLock: FieldValue.delete(),
    ...(plan.draftChanges ?? {}),
  });
  transaction.create(revisionsRef(key).doc(), {
    data: value,
    version,
    publishedAt: FieldValue.serverTimestamp(),
    publishedBy: actor.email,
    ...(plan.note ? { note: plan.note } : {}),
  });
  transaction.create(auditRef().doc(), auditEntry(actor, plan.action, plan.summary(value), key));
}

async function publishWith<K extends SectionKey>(
  key: K,
  expectedVersion: number,
  actor: Actor,
  plan: PublishPlan,
): Promise<SectionState<K>> {
  const lockId = randomUUID();
  const { value, rtdbValue, rtdbPath } = await acquireLock(key, expectedVersion, actor, plan, lockId);

  try {
    await adminDatabaseFor().ref(rtdbPath).set(rtdbValue);
  } catch (error) {
    await releaseLock(key, lockId);
    throw error;
  }

  let lastError: unknown;
  for (let attempt = 0; attempt < FINALIZE_ATTEMPTS; attempt += 1) {
    try {
      await firestore().runTransaction(async (transaction) => {
        const doc = (await transaction.get(contentRef(key))).data();
        if (!doc || doc.publishLock?.id !== lockId) throw staleVersion();
        finalize(transaction, key, doc, value, actor, plan);
      });
      return getSection(key);
    } catch (error) {
      lastError = error;
    }
  }
  throw new ContentError(
    `The live site data was updated, but saving the history failed: ${(lastError as Error).message}`,
    "partial_publish",
  );
}

export async function publish<K extends SectionKey>(
  key: K,
  expectedVersion: number,
  actor: Actor,
  note?: string,
): Promise<SectionState<K>> {
  return publishWith(key, expectedVersion, actor, {
    action: "publish",
    strict: true,
    pick: (doc) => doc.draft,
    summary: (value) => `Published ${SECTIONS[key].label}${describeCount(key, value)}`,
    note,
  });
}

export async function toggleEnabled<K extends SectionKey>(
  key: K,
  enabled: boolean,
  expectedVersion: number,
  actor: Actor,
): Promise<SectionState<K>> {
  if (!SECTIONS[key].hasEnabled) {
    throw new ContentError(`${SECTIONS[key].label} cannot be turned off.`, "not_toggleable");
  }
  return publishWith(key, expectedVersion, actor, {
    action: "toggle",
    strict: false,
    pick: (doc) => ({ ...(doc.published as Record<string, unknown>), enabled }),
    summary: () => `Turned ${SECTIONS[key].label} ${enabled ? "on" : "off"}`,
    draftChanges: { "draft.enabled": enabled },
  });
}

export async function listRevisions(key: SectionKey, limit = 20): Promise<RevisionSummary[]> {
  const snapshot = await revisionsRef(key).orderBy("publishedAt", "desc").limit(limit).get();
  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      version: data.version,
      publishedAt: iso(data.publishedAt),
      publishedBy: data.publishedBy,
      note: data.note ?? null,
      itemCount: itemCount(key, data.data),
    };
  });
}

export async function getRevision<K extends SectionKey>(
  key: K,
  revisionId: string,
): Promise<SectionValues[K]> {
  const snapshot = await revisionsRef(key).doc(revisionId).get();
  if (!snapshot.exists) throw new ContentError("That revision no longer exists.", "revision_missing");
  return parseSection(key, snapshot.get("data"));
}

export async function revertToRevision<K extends SectionKey>(
  key: K,
  revisionId: string,
  actor: Actor,
): Promise<SectionState<K>> {
  const snapshot = await revisionsRef(key).doc(revisionId).get();
  if (!snapshot.exists) throw new ContentError("That revision no longer exists.", "revision_missing");
  await readDoc(key);
  await contentRef(key).update({
    draft: parseSection(key, snapshot.get("data")),
    draftUpdatedAt: FieldValue.serverTimestamp(),
    draftUpdatedBy: actor.email,
  });
  const when = iso(snapshot.get("publishedAt"));
  await writeAudit(
    actor,
    "revert",
    `Loaded version ${snapshot.get("version")}${when ? ` from ${when.slice(0, 10)}` : ""} into the ${SECTIONS[key].label} draft`,
    key,
  );
  return getSection(key);
}

export type AuditQuery = {
  limit?: number;
  after?: string;
  sectionKey?: SectionKey;
  actorEmail?: string;
};

export async function listAudit({
  limit = 25,
  after,
  sectionKey,
  actorEmail,
}: AuditQuery = {}): Promise<{ entries: AuditEntry[]; next: string | null }> {
  let query: Query = auditRef();
  if (sectionKey) query = query.where("sectionKey", "==", sectionKey);
  if (actorEmail) query = query.where("actorEmail", "==", actorEmail);
  query = query.orderBy("at", "desc");
  if (after) {
    const cursor = await auditRef().doc(after).get();
    if (cursor.exists) query = query.startAfter(cursor);
  }
  const snapshot = await query.limit(limit + 1).get();
  const docs = snapshot.docs.slice(0, limit);
  return {
    entries: docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        at: iso(data.at),
        actorEmail: data.actorEmail,
        action: data.action,
        sectionKey: data.sectionKey ?? null,
        summary: data.summary,
      };
    }),
    next: snapshot.docs.length > limit ? docs[docs.length - 1].id : null,
  };
}
