import "server-only";

import { Timestamp } from "firebase-admin/firestore";

import { getAllSections, writeAudit, type Actor } from "@/lib/content/repository";
import { SECTION_KEYS, type SectionKey } from "@/lib/content/sections";
import { adminFirestore } from "@/lib/firebase/admin";

export type SiteSettings = {
  lastRebuildAt: string | null;
  lastRebuildBy: string | null;
  rebuildConfigured: boolean;
};

export type PendingRebuild = { sections: SectionKey[]; since: string | null };

export class RebuildError extends Error {
  constructor(
    message: string,
    readonly code: "not_configured" | "too_soon" | "hook_failed",
  ) {
    super(message);
    this.name = "RebuildError";
  }
}

const REBUILD_COOLDOWN_MS = 2 * 60 * 1000;
const IMPORT_ACTOR = "import:rtdb script";
const siteRef = () => adminFirestore().collection("settings").doc("site");

function buildHookUrl(): string | null {
  return process.env.NETLIFY_BUILD_HOOK_URL || null;
}

export async function getSiteSettings(): Promise<SiteSettings> {
  const data = (await siteRef().get()).data() as
    | { lastRebuildAt?: Timestamp; lastRebuildBy?: string }
    | undefined;
  return {
    lastRebuildAt: data?.lastRebuildAt?.toDate().toISOString() ?? null,
    lastRebuildBy: data?.lastRebuildBy ?? null,
    rebuildConfigured: Boolean(buildHookUrl()),
  };
}

export async function getPendingRebuild(): Promise<PendingRebuild> {
  const [settings, states] = await Promise.all([getSiteSettings(), getAllSections()]);
  const since = settings.lastRebuildAt ? Date.parse(settings.lastRebuildAt) : 0;
  const sections = SECTION_KEYS.filter((key) => {
    const state = states[key];
    if (!state?.publishedAt || state.publishedBy === IMPORT_ACTOR) return false;
    return Date.parse(state.publishedAt) > since;
  });
  return { sections, since: settings.lastRebuildAt };
}

async function claimRebuild(actor: Actor, enforceCooldown: boolean): Promise<void> {
  await adminFirestore().runTransaction(async (transaction) => {
    const snapshot = await transaction.get(siteRef());
    const last = snapshot.get("lastRebuildAt") as Timestamp | undefined;
    if (enforceCooldown && last && Date.now() - last.toMillis() < REBUILD_COOLDOWN_MS) {
      const wait = Math.ceil((REBUILD_COOLDOWN_MS - (Date.now() - last.toMillis())) / 1000);
      throw new RebuildError(`A rebuild was started moments ago. Try again in ${wait} seconds.`, "too_soon");
    }
    transaction.set(
      siteRef(),
      { lastRebuildAt: Timestamp.now(), lastRebuildBy: actor.email },
      { merge: true },
    );
  });
}

export async function triggerRebuild(actor: Actor): Promise<void> {
  const hook = buildHookUrl();
  if (!hook) throw new RebuildError("No Netlify build hook is configured.", "not_configured");
  await claimRebuild(actor, true);
  const response = await fetch(hook, { method: "POST", signal: AbortSignal.timeout(10_000) }).catch(
    () => null,
  );
  if (!response?.ok) {
    throw new RebuildError("Netlify did not accept the rebuild request. Try again or start it in Netlify.", "hook_failed");
  }
  await writeAudit(actor, "rebuild", "Started a website rebuild on Netlify");
}

export async function markRebuilt(actor: Actor): Promise<void> {
  await claimRebuild(actor, false);
  await writeAudit(actor, "rebuild", "Marked the website as rebuilt after a Netlify deploy");
}
