export const EMULATOR_PROJECT = "demo-gdg-siliguri";
export const E2E_NAMESPACE = "e2e";
export const FIRESTORE = "http://127.0.0.1:8080";
export const E2E_PORT = 3200;

export const TEST_USERS = {
  owner: { email: "owner@example.com", name: "Test Owner" },
  editor: { email: "editor@example.com", name: "Test Editor" },
  outsider: { email: "outsider@example.com", name: "Not An Admin" },
} as const;

const databaseUrl = `${FIRESTORE}/v1/projects/${EMULATOR_PROJECT}/databases/${E2E_NAMESPACE}`;
const ownerHeaders = { Authorization: "Bearer owner", "content-type": "application/json" };

export async function clearFirestore(): Promise<void> {
  const response = await fetch(
    `${FIRESTORE}/emulator/v1/projects/${EMULATOR_PROJECT}/databases/${E2E_NAMESPACE}/documents`,
    { method: "DELETE" },
  );
  if (!response.ok) throw new Error(`Could not clear the e2e Firestore: ${response.status}`);
}

export async function putAdmin(email: string, role: "owner" | "editor"): Promise<void> {
  const response = await fetch(`${databaseUrl}/documents/cms/root/admins/${encodeURIComponent(email)}`, {
    method: "PATCH",
    headers: ownerHeaders,
    body: JSON.stringify({
      fields: {
        email: { stringValue: email },
        role: { stringValue: role },
        addedBy: { stringValue: "playwright" },
        addedAt: { timestampValue: new Date().toISOString() },
      },
    }),
  });
  if (!response.ok) throw new Error(`Could not seed admin ${email}: ${response.status}`);
}

export async function readRtdb(path: string): Promise<unknown> {
  const response = await fetch(
    `http://127.0.0.1:9000/${path}.json?ns=${EMULATOR_PROJECT}-${E2E_NAMESPACE}`,
    { headers: { Authorization: "Bearer owner" } },
  );
  return response.json();
}

type FsValue = Record<string, unknown>;

function decode(value: FsValue): unknown {
  if ("mapValue" in value) {
    const fields = ((value.mapValue as { fields?: Record<string, FsValue> }).fields ?? {}) as Record<string, FsValue>;
    return Object.fromEntries(Object.entries(fields).map(([key, entry]) => [key, decode(entry)]));
  }
  if ("arrayValue" in value) return ((value.arrayValue as { values?: FsValue[] }).values ?? []).map(decode);
  if ("integerValue" in value) return Number(value.integerValue);
  if ("nullValue" in value) return null;
  return Object.values(value)[0];
}

export async function readFirestoreDoc(path: string): Promise<Record<string, unknown> | null> {
  const response = await fetch(`${databaseUrl}/documents/${path}`, { headers: ownerHeaders });
  if (response.status === 404) return null;
  const body = (await response.json()) as { fields?: Record<string, FsValue> };
  return decode({ mapValue: { fields: body.fields ?? {} } }) as Record<string, unknown>;
}

export async function readFirestoreCollection(path: string): Promise<Record<string, unknown>[]> {
  const response = await fetch(`${databaseUrl}/documents/${path}?pageSize=300`, { headers: ownerHeaders });
  const body = (await response.json()) as { documents?: { name: string; fields?: Record<string, FsValue> }[] };
  return (body.documents ?? []).map((doc) => ({
    id: doc.name.split("/").pop(),
    ...(decode({ mapValue: { fields: doc.fields ?? {} } }) as Record<string, unknown>),
  }));
}
