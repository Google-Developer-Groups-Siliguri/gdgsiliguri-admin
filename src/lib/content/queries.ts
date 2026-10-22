import "server-only";

import { requireAdminPage } from "@/lib/auth/session";
import { getSiteSettings } from "@/lib/settings";

import {
  getAllSections,
  getSection,
  listAudit,
  type AuditQuery,
} from "./repository";
import type { SectionKey } from "./sections";

export async function loadSection<K extends SectionKey>(key: K) {
  await requireAdminPage();
  return getSection(key);
}

export async function loadAllSections() {
  await requireAdminPage();
  return getAllSections();
}

export async function loadAudit(query: AuditQuery = {}) {
  await requireAdminPage();
  return listAudit(query);
}

export async function loadSiteSettings() {
  await requireAdminPage();
  return getSiteSettings();
}
