import "server-only";

import { FieldValue, Timestamp, type Firestore, type Query, type Transaction } from "firebase-admin/firestore";

import { deepEqual } from "@/lib/deep-equal";
import { adminFirestoreFor } from "@/lib/firebase/admin-app";
import { DOC_ID_PATTERN, SLUG_PATTERN } from "@/lib/schema/v2";
import { fromFirestore, toFirestore } from "@/lib/schema/v2/convert";
import { getSectionDef } from "@/lib/sections/server";
import type { SectionDef } from "@/lib/sections/registry";
import { autoId, uniqueSlug } from "@/lib/slug";
import { formatTime24 } from "@/lib/time/tz";

import { ContentError } from "./errors";
import { auditRef, revisionsRef, sectionRef, type CmsSectionDoc } from "./paths";

export type Actor = { email: string };

export type AuditAction =
  | "save_draft"
  | "discard"
  | "publish"
  | "toggle"
  | "revert"
  | "rebuild"
  | "admin_add"
  | "admin_remove"
  | "admin_role"
  | "blog_sync"
  | "showcase_review"
  | "legacy_sync"
  | "migration"
  | "edition_create";

type Doc = Record<string, unknown>;

export type SectionState<T = Doc> = {
  id: string;
  kind: "singleton" | "list";
  draft: T;
  published: T;
  version: number;
  draftVersion: number;
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
  sectionId: string | null;
  summary: string;
};

const AUDIT_COALESCE_MS = 10 * 60_000;
const SLUG_COLLECTIONS = /(^|-)(sessions|speakers|sponsors|partners|team|events|modules)$/;

export const db = (): Firestore => adminFirestoreFor();

function iso(value: Timestamp | undefined | null): string | null {
  return value ? value.toDate().toISOString() : null;
}

export function parseValue(def: SectionDef, value: unknown): Doc {
  return def.schema.lenient.parse(fromFirestore(value ?? {})) as Doc;
}

export function toState(def: SectionDef, doc: CmsSectionDoc): SectionState {
  const draft = parseValue(def, doc.draft);
  const published = parseValue(def, doc.published);
  return {
    id: def.id,
    kind: def.kind,
    draft,
    published,
    version: doc.version,
    draftVersion: doc.draftVersion ?? 1,
    hasDraftChanges: !deepEqual(fromFirestore(toFirestore(draft)), fromFirestore(toFirestore(published))),
    draftUpdatedAt: iso(doc.draftUpdatedAt),
    draftUpdatedBy: doc.draftUpdatedBy ?? null,
    publishedAt: iso(doc.publishedAt),
    publishedBy: doc.publishedBy ?? null,
  };
}

export function notImported(def: SectionDef): ContentError {
  return new ContentError(`${def.label} has not been migrated yet. Run npm run migrate:v2.`, "not_imported");
}

export function auditEntry(actor: Actor, action: AuditAction, summary: string, sectionId?: string) {
  return {
    at: FieldValue.serverTimestamp(),
    actorEmail: actor.email,
    action,
    summary,
    ...(sectionId ? { sectionId } : {}),
  };
}

export async function writeAudit(actor: Actor, action: AuditAction, summary: string, sectionId?: string) {
  await auditRef(db()).add(auditEntry(actor, action, summary, sectionId));
}

async function readSectionDoc(def: SectionDef, tx?: Transaction): Promise<CmsSectionDoc> {
  const ref = sectionRef(db(), def.id);
  const snapshot = tx ? await tx.get(ref) : await ref.get();
  const data = snapshot.data();
  if (!snapshot.exists || !data) throw notImported(def);
  return data;
}

export async function getSection(id: string): Promise<SectionState> {
  const def = await getSectionDef(db(), id);
  return toState(def, await readSectionDoc(def));
}

export async function getSections(ids: string[]): Promise<Record<string, SectionState>> {
  const states = await Promise.all(ids.map((id) => getSection(id).catch(() => null)));
  return Object.fromEntries(ids.flatMap((id, index) => (states[index] ? [[id, states[index]]] : [])));
}

function itemName(item: Doc): string {
  for (const field of ["name", "title", "label", "question"]) {
    if (typeof item[field] === "string" && item[field]) return item[field] as string;
  }
  return "";
}

function slugBase(def: SectionDef, item: Doc, zone: string): string {
  const name = itemName(item);
  if (!def.id.endsWith("-sessions") || typeof item.startAt !== "string" || !item.startAt) return name;
  try {
    return `${name}-${formatTime24(item.startAt, zone).replace(":", "")}`;
  } catch {
    return name;
  }
}

export function assignIds(def: SectionDef, draft: Doc, zone = "Asia/Kolkata"): Doc {
  if (def.kind !== "list" || !Array.isArray(draft.items)) return draft;
  const items = draft.items as Doc[];
  const slugged = SLUG_COLLECTIONS.test(def.id);
  const taken = new Set(items.map((item) => item.id).filter((id): id is string => typeof id === "string" && id !== ""));
  return {
    ...draft,
    items: items.map((item) => {
      const id = typeof item.id === "string" ? item.id : "";
      if (id && (slugged ? SLUG_PATTERN.test(id) : DOC_ID_PATTERN.test(id))) return item;
      if (slugged && !itemName(item)) return item;
      const next = slugged ? uniqueSlug(slugBase(def, item, zone), taken) : autoId();
      taken.add(next);
      return { ...item, id: next };
    }),
  };
}

function prepareDraft(def: SectionDef, draft: unknown): Doc {
  const parsed = def.schema.lenient.parse(draft) as Doc;
  const zone = typeof parsed.timeZone === "string" ? parsed.timeZone : undefined;
  return toFirestore(assignIds(def, parsed, zone));
}

async function coalesceAudit(tx: Transaction, actor: Actor, sectionId: string, summary: string) {
  const latest = await tx.get(
    auditRef(db()).where("sectionId", "==", sectionId).orderBy("at", "desc").limit(1) as Query,
  );
  const last = latest.docs[0];
  const at = last?.get("at") as Timestamp | undefined;
  const recent = Boolean(
    last?.get("action") === "save_draft" &&
    last.get("actorEmail") === actor.email &&
    at &&
    Date.now() - at.toMillis() < AUDIT_COALESCE_MS,
  );
  return () => {
    if (recent) tx.update(last.ref, { at: FieldValue.serverTimestamp() });
    else tx.create(auditRef(db()).doc(), auditEntry(actor, "save_draft", summary, sectionId));
  };
}

export async function saveDraft(
  id: string,
  draft: unknown,
  expectedDraftVersion: number,
  actor: Actor,
): Promise<SectionState> {
  const def = await getSectionDef(db(), id);
  const value = prepareDraft(def, draft);
  await db().runTransaction(async (tx) => {
    const doc = await readSectionDoc(def, tx);
    if ((doc.draftVersion ?? 1) !== expectedDraftVersion) {
      throw new ContentError("Someone else saved this draft. Reload to see their changes.", "stale_draft");
    }
    const writeAuditEntry = await coalesceAudit(tx, actor, def.id, `Saved a draft of ${def.label}`);
    tx.update(sectionRef(db(), def.id), {
      draft: value,
      draftVersion: (doc.draftVersion ?? 1) + 1,
      draftUpdatedAt: FieldValue.serverTimestamp(),
      draftUpdatedBy: actor.email,
    });
    writeAuditEntry();
  });
  return getSection(id);
}

export async function discardDraft(id: string, actor: Actor): Promise<SectionState> {
  const def = await getSectionDef(db(), id);
  await db().runTransaction(async (tx) => {
    const doc = await readSectionDoc(def, tx);
    tx.update(sectionRef(db(), def.id), {
      draft: doc.published,
      draftVersion: (doc.draftVersion ?? 1) + 1,
      draftUpdatedAt: FieldValue.serverTimestamp(),
      draftUpdatedBy: actor.email,
    });
    tx.create(auditRef(db()).doc(), auditEntry(actor, "discard", `Discarded the ${def.label} draft`, def.id));
  });
  return getSection(id);
}

export function itemCount(value: unknown): number | null {
  const items = (value as { items?: unknown } | null)?.items;
  return Array.isArray(items) ? items.length : null;
}

export async function listRevisions(id: string, limit = 20): Promise<RevisionSummary[]> {
  const def = await getSectionDef(db(), id);
  const snapshot = await revisionsRef(db(), def.id).orderBy("version", "desc").limit(limit).get();
  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      version: data.version,
      publishedAt: iso(data.publishedAt),
      publishedBy: data.publishedBy,
      note: data.note ?? null,
      itemCount: itemCount(data.data),
    };
  });
}

export async function getRevision(id: string, revisionId: string): Promise<Doc> {
  const def = await getSectionDef(db(), id);
  const snapshot = await revisionsRef(db(), def.id).doc(revisionId).get();
  if (!snapshot.exists) throw new ContentError("That revision no longer exists.", "revision_missing");
  return parseValue(def, snapshot.get("data"));
}

export async function revertToRevision(id: string, revisionId: string, actor: Actor): Promise<SectionState> {
  const def = await getSectionDef(db(), id);
  const revision = await revisionsRef(db(), def.id).doc(revisionId).get();
  if (!revision.exists) throw new ContentError("That revision no longer exists.", "revision_missing");
  await db().runTransaction(async (tx) => {
    const doc = await readSectionDoc(def, tx);
    const draft = { ...(revision.get("data") as Doc) };
    const published = doc.published as Doc;
    if (def.kind === "singleton" && published.sections) draft.sections = published.sections;
    tx.update(sectionRef(db(), def.id), {
      draft,
      draftVersion: (doc.draftVersion ?? 1) + 1,
      draftUpdatedAt: FieldValue.serverTimestamp(),
      draftUpdatedBy: actor.email,
    });
    const when = iso(revision.get("publishedAt"));
    tx.create(
      auditRef(db()).doc(),
      auditEntry(
        actor,
        "revert",
        `Loaded version ${revision.get("version")}${when ? ` from ${when.slice(0, 10)}` : ""} into the ${def.label} draft`,
        def.id,
      ),
    );
  });
  return getSection(id);
}

export type AuditQuery = {
  limit?: number;
  after?: string;
  sectionId?: string;
  actorEmail?: string;
  action?: AuditAction;
};

export async function listAudit({ limit = 25, after, sectionId, actorEmail, action }: AuditQuery = {}) {
  let query: Query = auditRef(db());
  if (sectionId) query = query.where("sectionId", "==", sectionId);
  if (actorEmail) query = query.where("actorEmail", "==", actorEmail);
  if (action) query = query.where("action", "==", action);
  query = query.orderBy("at", "desc");
  if (after) {
    const cursor = await auditRef(db()).doc(after).get();
    if (cursor.exists) query = query.startAfter(cursor);
  }
  const snapshot = await query.limit(limit + 1).get();
  const docs = snapshot.docs.slice(0, limit);
  return {
    entries: docs.map((doc): AuditEntry => ({
      id: doc.id,
      at: iso(doc.get("at")),
      actorEmail: doc.get("actorEmail"),
      action: doc.get("action"),
      sectionId: doc.get("sectionId") ?? null,
      summary: doc.get("summary"),
    })),
    next: snapshot.docs.length > limit ? docs[docs.length - 1].id : null,
  };
}
