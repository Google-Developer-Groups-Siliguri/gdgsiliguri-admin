import "server-only";

import { FieldValue, type Timestamp } from "firebase-admin/firestore";

import { adminFirestore } from "@/lib/firebase/admin";

export type SiteSettings = {
  lastRebuildAt: string | null;
  lastRebuildBy: string | null;
  rebuildConfigured: boolean;
};

const siteRef = () => adminFirestore().collection("settings").doc("site");

export async function getSiteSettings(): Promise<SiteSettings> {
  const data = (await siteRef().get()).data() as
    | { lastRebuildAt?: Timestamp; lastRebuildBy?: string }
    | undefined;
  return {
    lastRebuildAt: data?.lastRebuildAt?.toDate().toISOString() ?? null,
    lastRebuildBy: data?.lastRebuildBy ?? null,
    rebuildConfigured: Boolean(process.env.NETLIFY_BUILD_HOOK_URL),
  };
}

export async function recordRebuild(email: string): Promise<void> {
  await siteRef().set(
    { lastRebuildAt: FieldValue.serverTimestamp(), lastRebuildBy: email },
    { merge: true },
  );
}
