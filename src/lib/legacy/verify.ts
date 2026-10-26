import { readFileSync } from "node:fs";

import type { Database } from "firebase-admin/database";
import type { Firestore } from "firebase-admin/firestore";

import { createReader } from "@/lib/cms/reader";
import { LEGACY_NODES } from "@/lib/sections/registry";

import { compareNode, type AllowEntry, type NodeParity } from "./parity";
import { buildLegacyNode } from "./to-rtdb";

export const PARITY_ALLOWLIST = new URL("../../../scripts/parity-allowlist.json", import.meta.url);

export function readAllowlist(): AllowEntry[] {
  return JSON.parse(readFileSync(PARITY_ALLOWLIST, "utf8")) as AllowEntry[];
}

export async function verifyParity(
  db: Firestore,
  rtdb: Database,
  { normalize = true, allowlist = readAllowlist() }: { normalize?: boolean; allowlist?: AllowEntry[] } = {},
): Promise<NodeParity[]> {
  const sources = await createReader(db).legacySources();
  return Promise.all(
    LEGACY_NODES.map(async (node) => {
      const live = (await rtdb.ref(node).get()).val();
      return compareNode(node, buildLegacyNode(node, sources), live, allowlist, { normalize });
    }),
  );
}
