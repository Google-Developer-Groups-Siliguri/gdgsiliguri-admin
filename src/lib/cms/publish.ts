import "server-only";

import { randomUUID } from "node:crypto";

import type { Database } from "firebase-admin/database";
import { FieldValue, Timestamp, type Transaction } from "firebase-admin/firestore";

import type { ModuleDoc } from "@/lib/schema/v2";
import { isItemModule } from "@/lib/schema/v2/modules";
import { fromFirestore, toFirestore } from "@/lib/schema/v2/convert";
import {
  ALL_LEGACY_EDITION_NODES,
  visibilitySectionId,
  type BundleId,
  type LegacyNode,
  type SectionDef,
} from "@/lib/sections/registry";
import { getSectionDef } from "@/lib/sections/server";

import { buildBundle, bundlePath } from "./bundles";
import { planListPublish, singletonChanged, withoutMeta } from "./diff";
import { ContentError, issuesFrom, type PublishWarning } from "./errors";
import { legacySyncRef, revisionsRef, sectionRef, auditRef, type CmsSectionDoc } from "./paths";
import { createReader, type Overrides } from "./reader";
import { scheduleRebuild } from "./rebuild";
import {
  auditEntry,
  db,
  getSection,
  itemCount,
  notImported,
  parseValue,
  saveDraft,
  type Actor,
  type AuditAction,
  type SectionState,
} from "./repository";
import { pruneRevisions } from "./retention";
import { syncLegacy } from "./sync";
import { crossSectionIssues } from "./validate";

type Doc = Record<string, unknown>;

export const PUBLISH_LOCK_MS = 60_000;
export const MAX_BUNDLE_BYTES = 800 * 1024;
export const MAX_WRITES = 450;

export type PublishResult = {
  state: SectionState;
  warnings: PublishWarning[];
  bundles: BundleId[];
  legacyNodes: LegacyNode[];
};

type PublishOptions = { note?: string; action?: AuditAction; summary?: string; legacyDatabase?: Database };

function normalized(data: Doc): Doc {
  return fromFirestore(toFirestore(data));
}

function staleVersion(): ContentError {
  return new ContentError("Someone else published this section, so reload.", "stale_version");
}

async function acquireLock(
  def: SectionDef,
  expectedVersion: number,
  actor: Actor,
  lockId: string,
): Promise<CmsSectionDoc> {
  return db().runTransaction(async (tx) => {
    const snapshot = await tx.get(sectionRef(db(), def.id));
    const doc = snapshot.data();
    if (!snapshot.exists || !doc) throw notImported(def);
    if (doc.version !== expectedVersion) throw staleVersion();
    if (doc.publishLock && doc.publishLock.expiresAt.toMillis() > Date.now()) {
      throw new ContentError(
        `${doc.publishLock.by} is publishing this section right now. Try again in a minute.`,
        "publish_in_progress",
      );
    }
    tx.update(sectionRef(db(), def.id), {
      publishLock: { id: lockId, by: actor.email, expiresAt: Timestamp.fromMillis(Date.now() + PUBLISH_LOCK_MS) },
    });
    return doc;
  });
}

async function releaseLock(def: SectionDef, lockId: string): Promise<void> {
  await db()
    .runTransaction(async (tx) => {
      const doc = (await tx.get(sectionRef(db(), def.id))).data();
      if (doc?.publishLock?.id === lockId) tx.update(sectionRef(db(), def.id), { publishLock: FieldValue.delete() });
    })
    .catch(() => undefined);
}

function moduleEditions(value: Doc | undefined): number[] {
  const items = (value?.items ?? []) as Partial<ModuleDoc>[];
  return items.flatMap((module) => (typeof module.edition === "number" ? [module.edition] : []));
}

type Impact = { bundles: BundleId[]; legacyNodes: LegacyNode[] };

export function impactOf(def: SectionDef, previous: Doc, next: Doc): Impact {
  const bundles = new Set<BundleId>(def.bundles);
  const legacy = new Set<LegacyNode>(def.legacyNodes);
  if (def.id === "site-config" && previous.activeEdition !== next.activeEdition) {
    bundles.add(`edition-${next.activeEdition as number}`);
    ALL_LEGACY_EDITION_NODES.forEach((node) => legacy.add(node));
  }
  if (def.id === "modules") {
    for (const year of [...moduleEditions(previous), ...moduleEditions(next)]) bundles.add(`edition-${year}`);
  }
  return { bundles: [...bundles], legacyNodes: [...legacy] };
}

function validate(def: SectionDef, draft: Doc): Doc {
  const result = def.schema.strict.safeParse(draft);
  if (!result.success) {
    throw new ContentError("Fix the highlighted problems before publishing.", "invalid", issuesFrom(result.error));
  }
  return result.data as Doc;
}

function summaryFor(def: SectionDef, value: Doc): string {
  const count = itemCount(value);
  return `Published ${def.label}${count === null ? "" : ` (${count} ${count === 1 ? "item" : "items"})`}`;
}

type CommitInput = {
  def: SectionDef;
  value: Doc;
  actor: Actor;
  lockId: string;
  options: PublishOptions;
  impact: Impact;
};

async function commit(tx: Transaction, { def, value, actor, lockId, options, impact }: CommitInput) {
  const firestore = db();
  const cmsRef = sectionRef(firestore, def.id);
  const doc = (await tx.get(cmsRef)).data();
  if (!doc || doc.publishLock?.id !== lockId) throw staleVersion();
  const version = doc.version + 1;

  const overrides: Overrides = new Map();
  const target = def.target.path;
  overrides.set(target, def.kind === "list" ? ((value.items ?? []) as Doc[]) : value);
  const read = createReader(firestore, { tx, overrides, versions: { [def.id]: version } });

  const writes: ((tx: Transaction) => void)[] = [];
  const now = FieldValue.serverTimestamp();

  if (def.kind === "list") {
    const current = await createReader(firestore, { tx }).collection(target);
    const plan = planListPublish((value.items ?? []) as (Doc & { id: string })[], current, normalized);
    for (const { id, data } of plan.upserts) {
      writes.push((t) => t.set(firestore.doc(`${target}/${id}`), { ...toFirestore(data), updatedAt: now }));
    }
    for (const id of plan.deletes) writes.push((t) => t.delete(firestore.doc(`${target}/${id}`)));
    if (def.id === "modules") {
      for (const id of plan.deletes) {
        const items = await createReader(firestore, { tx }).collection(`moduleItems/${id}/items`);
        for (const item of items) writes.push((t) => t.delete(firestore.doc(`moduleItems/${id}/items/${item.id}`)));
      }
    }
  } else {
    const current = await createReader(firestore, { tx }).doc(target);
    if (singletonChanged(value, current, normalized)) {
      writes.push((t) => t.set(firestore.doc(target), { ...toFirestore(withoutMeta(value)), updatedAt: now }));
    }
  }

  const generatedAt = new Date().toISOString();
  const bundles = await Promise.all(
    impact.bundles.map(async (id) => ({ id, data: toFirestore(await buildBundle(id, read, { generatedAt })) })),
  );
  for (const bundle of bundles) {
    const bytes = Buffer.byteLength(JSON.stringify(fromFirestore(bundle.data)));
    if (bytes > MAX_BUNDLE_BYTES) {
      throw new ContentError(
        `The ${bundle.id} bundle would be ${Math.round(bytes / 1024)} KB, over the ${MAX_BUNDLE_BYTES / 1024} KB limit.`,
        "bundle_too_large",
      );
    }
    writes.push((t) => t.set(firestore.doc(bundlePath(bundle.id)), bundle.data));
  }

  const total = writes.length + 4;
  if (total > MAX_WRITES) {
    throw new ContentError(`This publish needs ${total} writes, over the limit of ${MAX_WRITES}.`, "too_many_writes");
  }

  for (const write of writes) write(tx);
  const stored = toFirestore(value);
  tx.update(cmsRef, {
    published: stored,
    version,
    publishedAt: now,
    publishedBy: actor.email,
    publishLock: FieldValue.delete(),
  });
  tx.create(revisionsRef(firestore, def.id).doc(), {
    data: stored,
    version,
    publishedAt: now,
    publishedBy: actor.email,
    ...(options.note ? { note: options.note } : {}),
  });
  tx.create(
    auditRef(firestore).doc(),
    auditEntry(actor, options.action ?? "publish", options.summary ?? summaryFor(def, value), def.id),
  );
  if (impact.legacyNodes.length) {
    tx.set(
      legacySyncRef(firestore),
      { pending: Object.fromEntries(impact.legacyNodes.map((node) => [node, { since: now, attempts: 0 }])) },
      { merge: true },
    );
  }
}

export async function publish(
  id: string,
  expectedVersion: number,
  actor: Actor,
  options: PublishOptions = {},
): Promise<PublishResult> {
  const def = await getSectionDef(db(), id);
  const lockId = randomUUID();
  const doc = await acquireLock(def, expectedVersion, actor, lockId);
  let impact: Impact;
  let value: Doc;
  try {
    value = validate(def, parseValue(def, doc.draft));
    const previous = parseValue(def, doc.published);
    const issues = await crossSectionIssues(def, value, createReader(db()));
    if (issues.length) throw new ContentError("Fix the highlighted problems before publishing.", "invalid", issues);
    impact = impactOf(def, previous, value);
    await db().runTransaction((tx) => commit(tx, { def, value, actor, lockId, options, impact }));
  } catch (error) {
    await releaseLock(def, lockId);
    throw error;
  }

  if (def.id === "modules") await ensureModuleSections(value);
  const warnings: PublishWarning[] = [];
  if (impact.legacyNodes.length) {
    const sync = await syncLegacy(impact.legacyNodes, actor, options.legacyDatabase).catch(() => null);
    if (!sync || sync.failed.length) warnings.push("legacy_sync_pending");
  }
  const siteActive = (await createReader(db()).doc("site/config"))?.activeEdition;
  if (impact.bundles.some((bundle) => bundle === "home" || bundle === `edition-${siteActive}`)) {
    await scheduleRebuild(actor).catch(() => undefined);
  }
  await pruneRevisions(def.id).catch(() => undefined);
  return { state: await getSection(def.id), warnings, ...impact };
}

async function ensureModuleSections(value: Doc): Promise<void> {
  const firestore = db();
  const modules = ((value.items ?? []) as Partial<ModuleDoc>[]).filter(
    (entry): entry is ModuleDoc => typeof entry.id === "string" && isItemModule(String(entry.type)),
  );
  for (const entry of modules) {
    const ref = sectionRef(firestore, `module-${entry.id}`);
    await ref
      .create({
        kind: "list",
        scope: { type: "module", moduleId: entry.id },
        draft: { items: [] },
        published: { items: [] },
        version: 1,
        draftVersion: 1,
      } as unknown as CmsSectionDoc)
      .catch(() => undefined);
  }
}

export async function toggleSection(id: string, enabled: boolean, actor: Actor): Promise<PublishResult> {
  const def = await getSectionDef(db(), id);
  const ownerId = visibilitySectionId(def);
  if (!ownerId || !def.visibilityKey) {
    throw new ContentError(`${def.label} cannot be turned off.`, "not_toggleable");
  }
  const owner = await getSection(ownerId);
  if (owner.hasDraftChanges) {
    const ownerDef = await getSectionDef(db(), ownerId);
    throw new ContentError(`Publish or discard the pending ${ownerDef.label} changes first.`, "owner_has_draft");
  }
  const sections = (owner.published.sections ?? {}) as Record<string, boolean>;
  if (sections[def.visibilityKey.key] === enabled) return { state: owner, warnings: [], bundles: [], legacyNodes: [] };
  const draft = { ...owner.published, sections: { ...sections, [def.visibilityKey.key]: enabled } };
  const saved = await saveDraft(ownerId, draft, owner.draftVersion, actor);
  return publish(ownerId, saved.version, actor, {
    action: "toggle",
    summary: `Turned ${def.label} ${enabled ? "on" : "off"}`,
  });
}

export async function rebuildBundles(ids: BundleId[], actor: Actor): Promise<void> {
  const firestore = db();
  const read = createReader(firestore);
  const generatedAt = new Date().toISOString();
  const batch = firestore.batch();
  for (const id of ids) batch.set(firestore.doc(bundlePath(id)), toFirestore(await buildBundle(id, read, { generatedAt })));
  await batch.commit();
  await scheduleRebuild(actor).catch(() => undefined);
}
