import { deepEqual } from "@/lib/deep-equal";

type Doc = Record<string, unknown>;

export type Change = { kind: "added" | "removed" | "changed"; label: string; fields?: string[] };

const IGNORED = new Set(["id", "updatedAt", "order"]);
const NAME_FIELDS = ["name", "title", "label", "question"];

export function humanize(key: string): string {
  const words = key
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .trim()
    .toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

function isPlainObject(value: unknown): value is Doc {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function changedFields(before: Doc, after: Doc, prefix = ""): string[] {
  const keys = [...new Set([...Object.keys(before), ...Object.keys(after)])].filter((key) => !IGNORED.has(key));
  return keys.flatMap((key) => {
    const previous = before[key];
    const next = after[key];
    if (deepEqual(previous, next)) return [];
    const label = prefix ? `${prefix} → ${humanize(key)}` : humanize(key);
    if (!prefix && isPlainObject(previous) && isPlainObject(next)) return changedFields(previous, next, label);
    return [label];
  });
}

function itemName(item: Doc, index: number): string {
  for (const field of NAME_FIELDS) {
    if (typeof item[field] === "string" && item[field]) return item[field] as string;
  }
  return `Item ${index + 1}`;
}

function listChanges(before: Doc[], after: Doc[]): Change[] {
  const key = (item: Doc, index: number) => (typeof item.id === "string" && item.id ? item.id : `#${index}`);
  const previous = new Map(before.map((item, index) => [key(item, index), item]));
  const next = new Map(after.map((item, index) => [key(item, index), item]));
  const changes: Change[] = [];
  after.forEach((item, index) => {
    const old = previous.get(key(item, index));
    if (!old) changes.push({ kind: "added", label: itemName(item, index) });
    else {
      const fields = changedFields(old, item);
      if (fields.length) changes.push({ kind: "changed", label: itemName(item, index), fields });
    }
  });
  before.forEach((item, index) => {
    if (!next.has(key(item, index))) changes.push({ kind: "removed", label: itemName(item, index) });
  });
  const reordered =
    changes.length === 0 &&
    !deepEqual(
      before.map((item, index) => key(item, index)),
      after.map((item, index) => key(item, index)),
    );
  return reordered ? [{ kind: "changed", label: "Order of items" }] : changes;
}

export function describeChanges(published: Doc, draft: Doc): Change[] {
  if (Array.isArray(published.items) || Array.isArray(draft.items)) {
    return listChanges((published.items ?? []) as Doc[], (draft.items ?? []) as Doc[]);
  }
  return changedFields(published, draft).map((label) => ({ kind: "changed", label }));
}
