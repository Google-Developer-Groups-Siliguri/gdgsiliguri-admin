import "server-only";

import { FieldValue, type Firestore, type WriteBatch } from "firebase-admin/firestore";

import type { V2Data } from "@/lib/legacy/from-rtdb";
import { toFirestore } from "@/lib/schema/v2/convert";
import { buildRegistry, type BundleId, type SectionDef } from "@/lib/sections/registry";

import { buildBundle, bundlePath } from "./bundles";
import { ContentError, issuesFrom, type ContentIssue } from "./errors";
import { auditRef, legacySyncRef, revisionsRef, sectionRef, sectionsRef } from "./paths";
import { createReader } from "./reader";
import { auditEntry, type Actor } from "./repository";
import { recordCurrentHashes } from "./sync";

type Doc = Record<string, unknown>;

const BATCH_LIMIT = 450;

export type MigrationPlan = { sections: { def: SectionDef; value: Doc }[]; bundles: BundleId[] };

function sectionValues(data: V2Data): Map<string, Doc> {
  const values = new Map<string, Doc>([
    ["site-config", data.site],
    ["site-app", data.siteApp],
    ["team", { items: data.team }],
    ["events", { items: data.events }],
    ["testimonials", { items: data.testimonials }],
    ["faqs", { items: data.faqs }],
    ["modules", { items: data.modules }],
  ]);
  for (const [year, content] of Object.entries(data.editions)) {
    values.set(`edition-${year}`, content.doc);
    values.set(`edition-${year}-sessions`, { items: content.sessions });
    values.set(`edition-${year}-speakers`, { items: content.speakers });
    values.set(`edition-${year}-sponsors`, { items: content.sponsors });
    values.set(`edition-${year}-partners`, { items: content.partners });
    values.set(`edition-${year}-faqs`, { items: content.faqs });
  }
  return values;
}

export function planMigration(data: V2Data): MigrationPlan {
  const years = Object.keys(data.editions).map(Number);
  const registry = buildRegistry({ activeEdition: data.site.activeEdition, editionYears: years, modules: [] });
  const values = sectionValues(data);
  const sections = registry.filter((def) => values.has(def.id)).map((def) => ({ def, value: values.get(def.id)! }));
  const bundles: BundleId[] = ["home", ...years.map((year) => `edition-${year}` as BundleId), "editions"];
  return { sections, bundles };
}

export function validateMigration(plan: MigrationPlan): ContentIssue[] {
  return plan.sections.flatMap(({ def, value }) => {
    const result = def.schema.strict.safeParse(value);
    return result.success ? [] : issuesFrom(result.error).map((issue) => ({ ...issue, path: [def.id, ...issue.path] }));
  });
}

class Batcher {
  private batch: WriteBatch;
  private count = 0;
  private committed: Promise<unknown>[] = [];
  writes = 0;

  constructor(private readonly db: Firestore) {
    this.batch = db.batch();
  }

  add(write: (batch: WriteBatch) => void) {
    if (this.count === BATCH_LIMIT) {
      this.committed.push(this.batch.commit());
      this.batch = this.db.batch();
      this.count = 0;
    }
    write(this.batch);
    this.count += 1;
    this.writes += 1;
  }

  async flush() {
    if (this.count) this.committed.push(this.batch.commit());
    await Promise.all(this.committed);
  }
}

export async function existingSections(db: Firestore): Promise<number> {
  return (await sectionsRef(db).limit(1).get()).size;
}

export async function applyMigration(
  db: Firestore,
  plan: MigrationPlan,
  { actor, note }: { actor: Actor; note: string },
): Promise<{ writes: number }> {
  const issues = validateMigration(plan);
  if (issues.length) throw new ContentError("The migrated data does not pass the strict schemas.", "invalid", issues);

  const now = FieldValue.serverTimestamp();
  const batcher = new Batcher(db);

  for (const { def, value } of plan.sections) {
    const parsed = def.schema.strict.parse(value) as Doc;
    if (def.kind === "list") {
      for (const item of (parsed.items ?? []) as Doc[]) {
        const { id, ...data } = item;
        batcher.add((batch) =>
          batch.set(db.doc(`${def.target.path}/${id as string}`), { ...toFirestore(data), updatedAt: now }),
        );
      }
    } else {
      batcher.add((batch) => batch.set(db.doc(def.target.path), { ...toFirestore(parsed), updatedAt: now }));
    }
    const stored = toFirestore(parsed);
    batcher.add((batch) =>
      batch.set(sectionRef(db, def.id), {
        kind: def.kind,
        scope: def.scope,
        draft: stored,
        published: stored,
        version: 1,
        draftVersion: 1,
        draftUpdatedAt: now,
        draftUpdatedBy: actor.email,
        publishedAt: now,
        publishedBy: actor.email,
      }),
    );
    batcher.add((batch) =>
      batch.set(revisionsRef(db, def.id).doc(), {
        data: stored,
        version: 1,
        publishedAt: now,
        publishedBy: actor.email,
        note,
      }),
    );
  }
  await batcher.flush();

  const read = createReader(db);
  const generatedAt = new Date().toISOString();
  const bundles = new Batcher(db);
  for (const id of plan.bundles) {
    const bundle = toFirestore(await buildBundle(id, read, { generatedAt }));
    bundles.add((batch) => batch.set(db.doc(bundlePath(id)), bundle));
  }
  bundles.add((batch) => batch.set(legacySyncRef(db), { pending: {}, lastHashes: {} }));
  bundles.add((batch) => batch.set(auditRef(db).doc(), auditEntry(actor, "migration", note)));
  await bundles.flush();

  await legacySyncRef(db).set({ lastHashes: await recordCurrentHashes() }, { merge: true });
  return { writes: batcher.writes + bundles.writes + 1 };
}

export async function deleteV2Data(db: Firestore): Promise<void> {
  const roots = [
    "site",
    "editions",
    "team",
    "events",
    "testimonials",
    "faqs",
    "modules",
    "moduleItems",
    "bundles",
    "cms",
  ];
  for (const root of roots) await db.recursiveDelete(db.collection(root));
}
