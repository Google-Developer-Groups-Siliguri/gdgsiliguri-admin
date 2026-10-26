import "server-only";

import { FieldValue } from "firebase-admin/firestore";

import { EDITION_SECTION_KEYS, type Edition, type Partner } from "@/lib/schema/v2";
import { toFirestore } from "@/lib/schema/v2/convert";
import { editionSections } from "@/lib/sections/registry";
import { loadRegistryInput } from "@/lib/sections/server";
import { formatLegacyDate, formatLegacyTime, isoInZone, time12To24 } from "@/lib/time/tz";

import { ContentError } from "./errors";
import { auditRef, sectionRef } from "./paths";
import { auditEntry, db, getSection, type Actor } from "./repository";

type Doc = Record<string, unknown>;

const NOT_COPIED = new Set(["highlight", "recap", "theme", "techStack", "updatedAt"]);

export type NewEdition = { year: number; from: number; date: string; copyPartners: boolean };

function onDate(iso: string, date: string, timeZone: string): string {
  return isoInZone(date, time12To24(formatLegacyTime(iso, timeZone)), timeZone);
}

export function editionFrom(source: Edition, { year, date }: Pick<NewEdition, "year" | "date">): Edition {
  const zone = source.timeZone;
  const days = Math.round(
    (Date.parse(`${formatLegacyDate(source.endAt, zone)}T00:00:00Z`) -
      Date.parse(`${formatLegacyDate(source.startAt, zone)}T00:00:00Z`)) /
      86_400_000,
  );
  const endDate = new Date(Date.parse(`${date}T00:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10);
  const rest = Object.fromEntries(Object.entries(source).filter(([key]) => !NOT_COPIED.has(key))) as Edition;
  return {
    ...rest,
    year,
    title: `DevFest Siliguri ${year}`,
    startAt: onDate(source.startAt, date, zone),
    endAt: onDate(source.endAt, endDate, zone),
    registration: {},
    sections: Object.fromEntries(EDITION_SECTION_KEYS.map((key) => [key, false])) as Edition["sections"],
  };
}

export async function createEdition(input: NewEdition, actor: Actor): Promise<void> {
  if (!Number.isInteger(input.year) || input.year < 2000 || input.year > 2100) {
    throw new ContentError("Choose a year between 2000 and 2100.", "invalid");
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date) || !input.date.startsWith(String(input.year))) {
    throw new ContentError(`Pick a date in ${input.year}.`, "invalid");
  }
  const source = (await getSection(`edition-${input.from}`)).published as Edition;
  const partners = input.copyPartners
    ? ((await getSection(`edition-${input.from}-partners`)).published.items as Partner[])
    : [];
  const registry = await loadRegistryInput(db());
  const defs = editionSections(input.year, registry);
  const values = new Map<string, Doc>([
    [`edition-${input.year}`, editionFrom(source, input)],
    [`edition-${input.year}-partners`, { items: partners }],
  ]);

  await db().runTransaction(async (tx) => {
    const existing = await tx.get(sectionRef(db(), `edition-${input.year}`));
    if (existing.exists) throw new ContentError(`DevFest ${input.year} already exists.`, "already_exists");
    for (const def of defs) {
      const draft = values.get(def.id) ?? (def.kind === "list" ? { items: [] } : {});
      tx.create(sectionRef(db(), def.id), {
        kind: def.kind,
        scope: def.scope,
        draft: toFirestore(draft),
        published: def.kind === "list" ? { items: [] } : {},
        version: 1,
        draftVersion: 1,
        draftUpdatedAt: FieldValue.serverTimestamp(),
        draftUpdatedBy: actor.email,
      });
    }
    tx.create(
      auditRef(db()).doc(),
      auditEntry(
        actor,
        "edition_create",
        `Created DevFest ${input.year} from DevFest ${input.from}`,
        `edition-${input.year}`,
      ),
    );
  });
}
