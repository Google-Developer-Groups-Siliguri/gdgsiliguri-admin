import "server-only";

import { after } from "next/server";

import { listAdmins } from "@/lib/admins/repository";
import { requireAdminPage } from "@/lib/auth/session";
import { parseSectionId, visibilitySectionId, type RegistryInput } from "@/lib/sections/registry";
import { getSectionDef, loadRegistryInput } from "@/lib/sections/server";

import { syncBlogsIfStale } from "./blogs";
import { flushRebuild, getRebuildState } from "./rebuild";
import { db, getSection, getSections, listAudit, type AuditQuery, type SectionState } from "./repository";
import { readLegacySyncState } from "./sync";

export type Visibility = { ownerId: string; enabled: boolean } | null;

export type LoadedSection = { state: SectionState; visibility: Visibility };

async function visibilityOf(id: string): Promise<Visibility> {
  const def = await getSectionDef(db(), id);
  const ownerId = visibilitySectionId(def);
  if (!ownerId || !def.visibilityKey) return null;
  const owner = await getSection(ownerId).catch(() => null);
  const sections = (owner?.published.sections ?? {}) as Record<string, boolean>;
  return { ownerId, enabled: Boolean(sections[def.visibilityKey.key]) };
}

export async function loadSection(id: string): Promise<LoadedSection> {
  await requireAdminPage(parseSectionId(id).type === "site-app" ? "owner" : "editor");
  const [state, visibility] = await Promise.all([getSection(id), visibilityOf(id)]);
  return { state, visibility };
}

export async function loadSectionStates(ids: string[]): Promise<Record<string, SectionState>> {
  await requireAdminPage();
  return getSections(ids);
}

export async function loadRegistry(): Promise<RegistryInput> {
  await requireAdminPage();
  return loadRegistryInput(db());
}

export async function loadAudit(query: AuditQuery = {}) {
  await requireAdminPage();
  return listAudit(query);
}

export async function loadAdmins() {
  await requireAdminPage("owner");
  return listAdmins();
}

const SCRIPT_ACTORS = [
  "admins:add script",
  "migrate:v2 script",
  "sync:legacy script",
  "legacy sync",
  "fix-content script",
  "cleanup-e2e script",
];

export async function loadActors() {
  await requireAdminPage();
  const admins = await listAdmins();
  return [...admins.map((admin) => admin.email), ...SCRIPT_ACTORS];
}

export async function loadLiveStatus() {
  const user = await requireAdminPage();
  await flushRebuild(user).catch(() => false);
  if (process.env.BLOG_AUTO_SYNC !== "false") after(() => syncBlogsIfStale(user).catch(() => null));
  const [sync, rebuild, lastPublish] = await Promise.all([
    readLegacySyncState(),
    getRebuildState(),
    listAudit({ action: "publish", limit: 1 }),
  ]);
  return {
    pending: Object.entries(sync.pending).map(([path, entry]) => ({
      path,
      attempts: entry.attempts,
      lastError: entry.lastError ?? null,
    })),
    lastSyncedAt: sync.lastSyncedAt?.toDate().toISOString() ?? null,
    rebuild,
    lastPublish: lastPublish.entries[0] ?? null,
  };
}

export type LiveStatus = Awaited<ReturnType<typeof loadLiveStatus>>;
