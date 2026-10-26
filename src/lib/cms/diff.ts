import { deepEqual } from "@/lib/deep-equal";

type Doc = Record<string, unknown>;
type Identified = Doc & { id: string };

export type ListPlan = { upserts: { id: string; data: Doc }[]; deletes: string[] };

const META_FIELDS = new Set(["id", "updatedAt"]);

export function withoutMeta(doc: Doc): Doc {
  return Object.fromEntries(Object.entries(doc).filter(([key]) => !META_FIELDS.has(key)));
}

export function planListPublish(
  draftItems: Identified[],
  currentDocs: Identified[],
  normalize: (data: Doc) => Doc = (data) => data,
): ListPlan {
  const current = new Map(currentDocs.map((doc) => [doc.id, normalize(withoutMeta(doc))]));
  const drafted = new Set(draftItems.map((item) => item.id));
  const upserts = draftItems.flatMap((item) => {
    const data = normalize(withoutMeta(item));
    const existing = current.get(item.id);
    return existing && deepEqual(existing, data) ? [] : [{ id: item.id, data }];
  });
  const deletes = currentDocs.filter((doc) => !drafted.has(doc.id)).map((doc) => doc.id);
  return { upserts, deletes };
}

export function singletonChanged(
  draft: Doc,
  current: Doc | null,
  normalize: (data: Doc) => Doc = (data) => data,
): boolean {
  return current === null || !deepEqual(normalize(withoutMeta(draft)), normalize(withoutMeta(current)));
}
