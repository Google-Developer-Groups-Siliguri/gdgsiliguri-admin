import { readFileSync } from "node:fs";

import { beforeAll, describe, expect, it } from "vitest";

import { adminFirestoreFor } from "@/lib/firebase/admin-app";
import { EMULATOR_PORTS, EMULATOR_PROJECT_ID, emulatorFirestoreDatabaseId } from "@/lib/firebase/config";
import { clearFirestore } from "@/test/v2-reset";

const base = () =>
  `http://127.0.0.1:${EMULATOR_PORTS.firestore}/v1/projects/${EMULATOR_PROJECT_ID}/databases/${emulatorFirestoreDatabaseId()}/documents`;

function token(uid: string): string {
  const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString("base64url");
  const now = Math.floor(Date.now() / 1000);
  return `${encode({ alg: "none", typ: "JWT" })}.${encode({
    iss: `https://securetoken.google.com/${EMULATOR_PROJECT_ID}`,
    aud: EMULATOR_PROJECT_ID,
    sub: uid,
    user_id: uid,
    email: `${uid}@example.com`,
    iat: now,
    exp: now + 3600,
    auth_time: now,
    firebase: { sign_in_provider: "custom", identities: {} },
  })}.`;
}

type As = "anonymous" | "signed-in";

function headers(as: As): HeadersInit {
  return as === "signed-in" ? { Authorization: `Bearer ${token("someone")}` } : {};
}

async function read(path: string, as: As = "anonymous"): Promise<number> {
  return (await fetch(`${base()}/${path}`, { headers: headers(as) })).status;
}

async function write(path: string, as: As = "anonymous"): Promise<number> {
  const response = await fetch(`${base()}/${path}`, {
    method: "PATCH",
    headers: { ...headers(as), "content-type": "application/json" },
    body: JSON.stringify({ fields: { hacked: { booleanValue: true } } }),
  });
  return response.status;
}

async function loadRules(): Promise<void> {
  const content = readFileSync(new URL("../../../firestore.rules", import.meta.url), "utf8");
  const url = `http://127.0.0.1:${EMULATOR_PORTS.firestore}/emulator/v1/projects/${EMULATOR_PROJECT_ID}/databases/${emulatorFirestoreDatabaseId()}:securityRules`;
  const response = await fetch(url, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ rules: { files: [{ name: "firestore.rules", content }] } }),
  });
  if (!response.ok) throw new Error(`Could not load the rules: ${response.status}`);
}

beforeAll(async () => {
  await loadRules();
  await clearFirestore();
  const db = adminFirestoreFor();
  const docs = [
    "site/config",
    "site/app",
    "bundles/home",
    "editions/2026",
    "editions/2026/sessions/x",
    "team/a",
    "cms/root/admins/a@b.c",
    "cms/root/showcaseSubmissions/x",
    "content/teams",
  ];
  await Promise.all(docs.map((path) => db.doc(path).set({ ok: true })));
});

describe("firestore rules", () => {
  it.each(["site/config", "site/app", "bundles/home", "editions/2026", "editions/2026/sessions/x", "team/a"])(
    "lets anyone get %s",
    async (path) => {
      expect(await read(path)).toBe(200);
    },
  );

  it("doesn't let anyone list site", async () => {
    expect(await read("site")).toBe(403);
  });

  it.each(["cms/root/admins/a@b.c", "cms/root/showcaseSubmissions/x", "content/teams"])(
    "hides %s even from signed-in users",
    async (path) => {
      expect(await read(path)).toBe(403);
      expect(await read(path, "signed-in")).toBe(403);
    },
  );

  it.each(["site/config", "bundles/home", "editions/2026/sessions/x", "team/a", "cms/root/admins/a@b.c", "anything/x"])(
    "refuses writes to %s, including from signed-in users",
    async (path) => {
      expect(await write(path)).toBe(403);
      expect(await write(path, "signed-in")).toBe(403);
    },
  );
});
