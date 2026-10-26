import type { SectionValues } from "@/lib/legacy/schemas";
import { SPONSOR_TIERS } from "@/lib/legacy/schemas";
import { SECTIONS, type SectionKey } from "./sections";

export const E2E_PATTERN = /\bE2E\b|e2e-test/i;

export type Change = { section: SectionKey; path: string; description: string };
export type PatchResult = { sections: Partial<SectionValues>; changes: Change[] };

function mentionsE2E(value: unknown): boolean {
  if (typeof value === "string") return E2E_PATTERN.test(value);
  if (Array.isArray(value)) return value.some(mentionsE2E);
  if (value && typeof value === "object") return Object.values(value).some(mentionsE2E);
  return false;
}

function label(item: unknown): string {
  if (typeof item === "string") return item;
  const record = item as Record<string, unknown>;
  const text = ["name", "title", "question", "sponsorName", "communityName", "feedbackTitle"]
    .map((field) => record[field])
    .find((value) => typeof value === "string" && value);
  return typeof text === "string" ? text : JSON.stringify(item).slice(0, 60);
}

function filterList<T>(items: T[], path: string, section: SectionKey, changes: Change[]): T[] {
  return items.filter((item, index) => {
    if (!mentionsE2E(item)) return true;
    changes.push({ section, path: `${path}[${index}]`, description: `Remove "${label(item)}"` });
    return false;
  });
}

function withEnabledData<V extends { enabled: boolean; data: unknown[] }>(value: V, data: unknown[]): V {
  const emptied = value.data.length > 0 && data.length === 0;
  return { ...value, data, enabled: emptied ? false : value.enabled };
}

export function removeE2EItems(key: SectionKey, value: SectionValues[SectionKey]): { value: SectionValues[SectionKey]; changes: Change[] } {
  const changes: Change[] = [];
  const base = SECTIONS[key].rtdbPath.replace("/", ".");

  if (key === "eventDetails") {
    const details = value as SectionValues["eventDetails"];
    return {
      value: {
        ...details,
        perks: withEnabledData(details.perks, filterList(details.perks.data, `${base}.perks.data`, key, changes)),
        pointsToNote: withEnabledData(
          details.pointsToNote,
          filterList(details.pointsToNote.data, `${base}.pointsToNote.data`, key, changes),
        ),
        socialMediaLinks: filterList(details.socialMediaLinks, `${base}.socialMediaLinks`, key, changes),
      },
      changes,
    };
  }

  if (key === "sponsors") {
    const sponsors = { ...(value as SectionValues["sponsors"]) };
    for (const tier of SPONSOR_TIERS) sponsors[tier] = filterList(sponsors[tier], `${base}.${tier}`, key, changes);
    return { value: sponsors, changes };
  }

  const list = value as { enabled: boolean; data: unknown[] };
  return { value: withEnabledData(list, filterList(list.data, `${base}.data`, key, changes)) as SectionValues[SectionKey], changes };
}

export function removeE2E(sections: Partial<SectionValues>): PatchResult {
  const next: Partial<SectionValues> = {};
  const changes: Change[] = [];
  for (const [key, value] of Object.entries(sections) as [SectionKey, SectionValues[SectionKey]][]) {
    const result = removeE2EItems(key, value);
    (next as Record<string, unknown>)[key] = result.value;
    changes.push(...result.changes);
  }
  return { sections: next, changes };
}
