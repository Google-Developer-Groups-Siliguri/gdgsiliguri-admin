import type { PatchResult } from "../../src/lib/content/cleanup";
import { getAllSections, publish, saveDraft, type Actor } from "../../src/lib/content/repository";
import type { SectionValues } from "../../src/lib/legacy/schemas";
import { SECTIONS, type SectionKey } from "../../src/lib/content/sections";
import { deepEqual } from "../../src/lib/deep-equal";

export type PatchOutcome = { key: SectionKey; status: "published" | "planned" | "unchanged" | "skipped"; detail?: string };

export async function patchLegacySections(
  transform: (sections: Partial<SectionValues>) => PatchResult,
  { apply, actor, note }: { apply: boolean; actor: Actor; note: string },
): Promise<{ result: PatchResult; outcomes: PatchOutcome[] }> {
  const states = await getAllSections();
  const published = Object.fromEntries(
    Object.entries(states).map(([key, state]) => [key, state!.published]),
  ) as Partial<SectionValues>;
  const result = transform(structuredClone(published));
  const outcomes: PatchOutcome[] = [];

  for (const key of Object.keys(states) as SectionKey[]) {
    const state = states[key]!;
    const next = result.sections[key];
    if (next === undefined || deepEqual(next, state.published)) {
      outcomes.push({ key, status: "unchanged" });
      continue;
    }
    if (state.hasDraftChanges) {
      outcomes.push({
        key,
        status: "skipped",
        detail: `${SECTIONS[key].label} has unpublished draft edits. Publish or discard them, then run again.`,
      });
      continue;
    }
    if (!apply) {
      outcomes.push({ key, status: "planned" });
      continue;
    }
    await saveDraft(key, next, actor);
    await publish(key, state.version, actor, note);
    outcomes.push({ key, status: "published" });
  }
  return { result, outcomes };
}

export function printPatch({ result, outcomes }: Awaited<ReturnType<typeof patchLegacySections>>, apply: boolean) {
  for (const change of result.changes) console.log(`  ${change.path.padEnd(42)} ${change.description}`);
  console.log(`${result.changes.length} change(s).`);
  for (const outcome of outcomes.filter((entry) => entry.status !== "unchanged")) {
    console.log(`${outcome.status.padEnd(9)} ${outcome.key}${outcome.detail ? `: ${outcome.detail}` : ""}`);
  }
  if (!apply && result.changes.length) console.log("Dry run. Pass --apply to publish these changes.");
}
