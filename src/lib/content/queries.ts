import "server-only";

import { requireAdminPage } from "@/lib/auth/session";
import { listAdmins } from "@/lib/admins/repository";

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

export async function loadAdmins() {
  await requireAdminPage("owner");
  return listAdmins();
}

const SCRIPT_ACTORS = ["admins:add script", "import:rtdb script"];

export async function loadActors() {
  await requireAdminPage();
  const admins = await listAdmins();
  return [...admins.map((admin) => admin.email), ...SCRIPT_ACTORS];
}
