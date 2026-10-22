import "./lib/load-env";

import { getFirestore, FieldValue } from "firebase-admin/firestore";

import { adminApp } from "../src/lib/firebase/admin-app";
import { isRole, normalizeEmail } from "../src/lib/auth/roles";

import { parseArgs } from "./lib/args";
import { assertTargetAllowed, fail } from "./lib/target";

const USAGE = "Usage: npm run admins:add -- --email someone@gmail.com --role owner|editor [--production]";

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const rawEmail = args.get("email");
  const role = args.get("role") ?? "editor";
  if (typeof rawEmail !== "string" || !rawEmail.includes("@")) fail(`--email is required.\n${USAGE}`);
  if (!isRole(role)) fail(`--role must be owner or editor.\n${USAGE}`);

  assertTargetAllowed(args);
  const email = normalizeEmail(rawEmail);
  const ref = getFirestore(adminApp()).collection("admins").doc(email);
  const existing = await ref.get();

  if (existing.exists) {
    const previous = existing.get("role");
    await ref.update({ role });
    console.log(`Updated ${email}: role ${previous} → ${role}`);
  } else {
    await ref.set({ email, role, addedBy: "admins:add script", addedAt: FieldValue.serverTimestamp() });
    console.log(`Added ${email} as ${role}`);
  }

  await getFirestore(adminApp())
    .collection("auditLog")
    .add({
      at: FieldValue.serverTimestamp(),
      actorEmail: "admins:add script",
      action: existing.exists ? "admin_role" : "admin_add",
      summary: existing.exists ? `Changed ${email} to ${role}` : `Added ${email} as ${role}`,
    });
}

main().catch((error: unknown) => fail((error as Error).message));
