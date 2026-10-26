import "server-only";

import { FieldValue, Timestamp } from "firebase-admin/firestore";

import { auditRef, settingsRef } from "./paths";
import { auditEntry, db, type Actor } from "./repository";

export const REBUILD_DEBOUNCE_MS = 5 * 60_000;

export type RebuildState = {
  requestedAt: string | null;
  lastRebuildAt: string | null;
  lastRebuildBy: string | null;
  pending: boolean;
  configured: boolean;
};

function hookUrl(): string | null {
  return process.env.NETLIFY_BUILD_HOOK_URL || null;
}

function iso(value: unknown): string | null {
  return value instanceof Timestamp ? value.toDate().toISOString() : null;
}

export async function getRebuildState(): Promise<RebuildState> {
  const data = (await settingsRef(db(), "site").get()).data() ?? {};
  const requestedAt = iso(data.rebuildRequestedAt);
  const lastRebuildAt = iso(data.lastRebuildAt);
  return {
    requestedAt,
    lastRebuildAt,
    lastRebuildBy: data.lastRebuildBy ?? null,
    pending: Boolean(requestedAt && (!lastRebuildAt || requestedAt > lastRebuildAt)),
    configured: hookUrl() !== null,
  };
}

async function trigger(actor: Actor): Promise<boolean> {
  const url = hookUrl();
  if (!url) return false;
  const response = await fetch(url, { method: "POST", signal: AbortSignal.timeout(10_000) }).catch(() => null);
  if (!response?.ok) return false;
  await settingsRef(db(), "site").set(
    { lastRebuildAt: FieldValue.serverTimestamp(), lastRebuildBy: actor.email },
    { merge: true },
  );
  await auditRef(db()).add(auditEntry(actor, "rebuild", "Started a website rebuild on Netlify"));
  return true;
}

export async function flushRebuild(actor: Actor, now = Date.now()): Promise<boolean> {
  const state = await getRebuildState();
  if (!state.pending || !state.configured) return false;
  const last = state.lastRebuildAt ? Date.parse(state.lastRebuildAt) : 0;
  if (now - last < REBUILD_DEBOUNCE_MS) return false;
  return trigger(actor);
}

export async function scheduleRebuild(actor: Actor): Promise<boolean> {
  await settingsRef(db(), "site").set({ rebuildRequestedAt: FieldValue.serverTimestamp() }, { merge: true });
  return flushRebuild(actor);
}
