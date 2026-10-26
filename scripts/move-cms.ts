import "./lib/load-env";

import type { Firestore } from "firebase-admin/firestore";

import { adminFirestoreFor } from "../src/lib/firebase/admin-app";

import { parseArgs } from "./lib/args";
import { assertTargetAllowed, fail } from "./lib/target";

export const SECTION_KEY_TO_ID: Record<string, string> = {
  eventDetails: "edition-2026",
  schedule: "edition-2026-sessions",
  speakers: "edition-2026-speakers",
  sponsors: "edition-2026-sponsors",
  communityPartners: "edition-2026-partners",
  devfestFaqs: "edition-2026-faqs",
  gdgFaqs: "faqs",
  teams: "team",
  feedbacks: "testimonials",
  events: "events",
};

type Copy = { from: string; to: string; data: Record<string, unknown> };

export async function planCmsMove(db: Firestore): Promise<Copy[]> {
  const copies: Copy[] = [];
  for (const doc of (await db.collection("admins").get()).docs) {
    copies.push({ from: doc.ref.path, to: `cms/root/admins/${doc.id}`, data: doc.data() });
  }
  const settings = await db.doc("settings/site").get();
  if (settings.exists) copies.push({ from: "settings/site", to: "cms/root/settings/site", data: settings.data()! });
  for (const doc of (await db.collection("auditLog").get()).docs) {
    const { sectionKey, ...rest } = doc.data();
    const sectionId = typeof sectionKey === "string" ? (SECTION_KEY_TO_ID[sectionKey] ?? sectionKey) : undefined;
    copies.push({
      from: doc.ref.path,
      to: `cms/root/auditLog/${doc.id}`,
      data: sectionId ? { ...rest, sectionId } : rest,
    });
  }
  return copies;
}

export async function applyCmsMove(db: Firestore, copies: Copy[]): Promise<void> {
  for (let start = 0; start < copies.length; start += 450) {
    const batch = db.batch();
    for (const copy of copies.slice(start, start + 450)) batch.set(db.doc(copy.to), copy.data, { merge: true });
    await batch.commit();
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  assertTargetAllowed(args);
  const db = adminFirestoreFor();
  const copies = await planCmsMove(db);
  const kinds = (prefix: string) => copies.filter((copy) => copy.to.startsWith(prefix)).length;
  console.log(
    `${kinds("cms/root/admins")} admins, ${kinds("cms/root/settings")} settings, ${kinds("cms/root/auditLog")} audit entries.`,
  );
  if (args.get("apply") !== true) {
    console.log("Dry run. Pass --apply to copy. The old documents are kept; delete them by hand after 30 days.");
    process.exit(0);
  }
  await applyCmsMove(db, copies);
  console.log(`Copied ${copies.length} documents under cms/root.`);
  process.exit(0);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error: unknown) => fail((error as Error).message));
}
