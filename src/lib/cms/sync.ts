import "server-only";

import { createHash } from "node:crypto";

import type { Database } from "firebase-admin/database";
import { FieldValue, type Timestamp } from "firebase-admin/firestore";

import { adminDatabaseFor } from "@/lib/firebase/admin-app";
import { buildLegacyNode } from "@/lib/legacy/to-rtdb";
import { LEGACY_NODES, type LegacyNode } from "@/lib/sections/registry";

import { auditRef, driftRef, legacySyncRef } from "./paths";
import { createReader } from "./reader";
import { auditEntry, db, type Actor } from "./repository";

const RTDB_TIMEOUT_MS = Number(process.env.LEGACY_RTDB_TIMEOUT_MS ?? 10_000);

type Pending = { since: Timestamp; attempts: number; lastError?: string };

export type LegacySyncState = {
  pending: Record<string, Pending>;
  lastSyncedAt?: Timestamp;
  lastHashes: Record<string, string>;
};

export type SyncResult = {
  skipped: boolean;
  synced: LegacyNode[];
  failed: { path: LegacyNode; error: string }[];
  drift: LegacyNode[];
};

export function legacySyncEnabled(): boolean {
  return process.env.LEGACY_RTDB_SYNC !== "false";
}

function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, canonical((value as Record<string, unknown>)[key])]),
    );
  }
  return value;
}

export function hashNode(value: unknown): string {
  return createHash("sha256")
    .update(JSON.stringify(canonical(value ?? null)))
    .digest("hex");
}

function withTimeout<T>(promise: Promise<T>, what: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`${what} timed out after ${RTDB_TIMEOUT_MS} ms`)), RTDB_TIMEOUT_MS).unref(),
    ),
  ]);
}

export async function readLegacySyncState(): Promise<LegacySyncState> {
  const data = (await legacySyncRef(db()).get()).data() ?? {};
  return { pending: data.pending ?? {}, lastSyncedAt: data.lastSyncedAt, lastHashes: data.lastHashes ?? {} };
}

export async function syncLegacy(
  paths: LegacyNode[] | "pending" | "all" = "pending",
  actor?: Actor,
  rtdb: Database = adminDatabaseFor(),
): Promise<SyncResult> {
  const result: SyncResult = { skipped: false, synced: [], failed: [], drift: [] };
  if (!legacySyncEnabled()) return { ...result, skipped: true };

  const state = await readLegacySyncState();
  const targets: LegacyNode[] =
    paths === "all" ? [...LEGACY_NODES] : paths === "pending" ? (Object.keys(state.pending) as LegacyNode[]) : paths;
  if (targets.length === 0) return result;

  const sources = await createReader(db()).legacySources();
  const hashes: Record<string, string> = {};
  const pendingUpdates: Record<string, unknown> = {};

  for (const path of targets) {
    try {
      const node = buildLegacyNode(path, sources);
      const live = (await withTimeout(rtdb.ref(path).get(), `Reading /${path}`)).val();
      const liveHash = hashNode(live);
      const nodeHash = hashNode(node);
      const known = state.lastHashes[path];
      if (known && known !== liveHash && liveHash !== nodeHash) {
        result.drift.push(path);
        await driftRef(db()).add({ path, json: JSON.stringify(live), detectedAt: FieldValue.serverTimestamp() });
        await auditRef(db()).add(
          auditEntry(actor ?? { email: "legacy sync" }, "legacy_sync", `Overwrote a manual RTDB edit at /${path}`),
        );
      }
      if (liveHash !== nodeHash) await withTimeout(rtdb.ref(path).set(node), `Writing /${path}`);
      hashes[path] = nodeHash;
      pendingUpdates[path] = FieldValue.delete();
      result.synced.push(path);
    } catch (error) {
      const message = (error as Error).message;
      const previous = state.pending[path];
      result.failed.push({ path, error: message });
      pendingUpdates[path] = {
        since: previous?.since ?? FieldValue.serverTimestamp(),
        attempts: (previous?.attempts ?? 0) + 1,
        lastError: result.drift.includes(path) ? `drift; ${message}` : message,
      };
    }
  }

  await legacySyncRef(db()).set(
    {
      pending: pendingUpdates,
      lastHashes: hashes,
      ...(result.synced.length ? { lastSyncedAt: FieldValue.serverTimestamp() } : {}),
    },
    { merge: true },
  );
  return result;
}

export async function recordCurrentHashes(
  paths: readonly LegacyNode[] = LEGACY_NODES,
): Promise<Record<string, string>> {
  const rtdb = adminDatabaseFor();
  const entries = await Promise.all(
    paths.map(async (path) => [path, hashNode((await withTimeout(rtdb.ref(path).get(), `Reading /${path}`)).val())]),
  );
  return Object.fromEntries(entries);
}
