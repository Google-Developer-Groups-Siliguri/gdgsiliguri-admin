import { jsonDiff, normalizeLegacy, type JsonDiff } from "./compare";

export type AllowEntry = { node: string; pointer: string; reason: string };

export type NodeParity = {
  node: string;
  allowed: (JsonDiff & { reason: string })[];
  unexpected: JsonDiff[];
  cosmetic: number;
};

function covers(entry: AllowEntry, node: string, pointer: string): boolean {
  if (entry.node !== node) return false;
  return entry.pointer === "" || pointer === entry.pointer || pointer.startsWith(`${entry.pointer}/`);
}

export function compareNode(
  node: string,
  built: unknown,
  live: unknown,
  allowlist: AllowEntry[],
  { normalize = true }: { normalize?: boolean } = {},
): NodeParity {
  const raw = jsonDiff(built ?? null, live ?? null);
  const diffs = normalize ? jsonDiff(normalizeLegacy(built ?? null), normalizeLegacy(live ?? null)) : raw;
  const result: NodeParity = { node, allowed: [], unexpected: [], cosmetic: raw.length - diffs.length };
  for (const diff of diffs) {
    const entry = allowlist.find((candidate) => covers(candidate, node, diff.pointer === "/" ? "" : diff.pointer));
    if (entry) result.allowed.push({ ...diff, reason: entry.reason });
    else result.unexpected.push(diff);
  }
  return result;
}

function show(value: unknown): string {
  const text = JSON.stringify(value);
  if (text === undefined) return "(absent)";
  return text.length > 90 ? `${text.slice(0, 87)}…` : text;
}

export function formatParity(results: NodeParity[]): string {
  const lines: string[] = [];
  for (const result of results) {
    const status = result.unexpected.length ? "DIFF" : "ok  ";
    const extra = [
      result.allowed.length ? `${result.allowed.length} allowed` : "",
      result.cosmetic ? `${result.cosmetic} cosmetic` : "",
    ].filter(Boolean);
    lines.push(`${status} /${result.node}${extra.length ? ` (${extra.join(", ")})` : ""}`);
    for (const diff of result.unexpected) {
      lines.push(`       ${diff.pointer}: live ${show(diff.actual)} → v2 ${show(diff.expected)}`);
    }
    for (const diff of result.allowed) lines.push(`       allowed ${diff.pointer}: ${diff.reason}`);
  }
  return lines.join("\n");
}
