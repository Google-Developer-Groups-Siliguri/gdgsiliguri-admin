import "server-only";

import type { Firestore } from "firebase-admin/firestore";

import { ContentError } from "@/lib/cms/errors";
import { sectionRef, sectionsRef } from "@/lib/cms/paths";
import type { ModuleDoc } from "@/lib/schema/v2";
import { fromFirestore } from "@/lib/schema/v2/convert";

import {
  buildRegistry,
  isSectionId,
  parseSectionId,
  sectionDefFor,
  UnknownSectionError,
  type RegistryInput,
  type SectionDef,
} from "./registry";

type ModuleSummary = RegistryInput["modules"][number];

function moduleSummaries(value: unknown): ModuleSummary[] {
  const items = (value as { items?: Partial<ModuleDoc>[] } | undefined)?.items ?? [];
  return items
    .filter((item): item is ModuleDoc => typeof item.id === "string" && item.id !== "")
    .map(({ id, title, type, edition, icon }) => ({ id, title, type, edition, icon }));
}

export async function loadRegistryInput(db: Firestore): Promise<RegistryInput> {
  const snapshot = await sectionsRef(db).get();
  const docs = new Map(snapshot.docs.map((doc) => [doc.id, doc.data()]));
  const siteConfig = fromFirestore<{ activeEdition?: number }>(docs.get("site-config")?.published ?? {});
  const editionYears = [...docs.keys()].flatMap((id) => {
    const match = /^edition-(\d{4})$/.exec(id);
    return match ? [Number(match[1])] : [];
  });
  const modulesDoc = docs.get("modules");
  const modules = new Map<string, ModuleSummary>();
  for (const value of [modulesDoc?.published, modulesDoc?.draft]) {
    for (const summary of moduleSummaries(fromFirestore(value))) modules.set(summary.id, summary);
  }
  const activeEdition = siteConfig.activeEdition ?? Math.max(new Date().getFullYear(), ...editionYears);
  return { activeEdition, editionYears, modules: [...modules.values()] };
}

export async function allSections(db: Firestore): Promise<SectionDef[]> {
  return buildRegistry(await loadRegistryInput(db));
}

export async function getSectionDef(db: Firestore, id: string): Promise<SectionDef> {
  if (!isSectionId(id)) throw new ContentError("Unknown section.", "unknown_section");
  const input = await loadRegistryInput(db);
  const parsed = parseSectionId(id);
  if (parsed.type === "edition" && !(await sectionRef(db, `edition-${parsed.year}`).get()).exists) {
    throw new ContentError(`DevFest ${parsed.year} doesn't exist yet.`, "unknown_section");
  }
  try {
    return sectionDefFor(id, input);
  } catch (error) {
    if (error instanceof UnknownSectionError) throw new ContentError("Unknown section.", "unknown_section");
    throw error;
  }
}
