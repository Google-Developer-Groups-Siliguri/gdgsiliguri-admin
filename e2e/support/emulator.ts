export const EMULATOR_PROJECT = "demo-gdg-siliguri";
export const FIRESTORE = "http://127.0.0.1:8080";

export const TEST_USERS = {
  owner: { email: "owner@example.com", name: "Test Owner" },
  editor: { email: "editor@example.com", name: "Test Editor" },
  outsider: { email: "outsider@example.com", name: "Not An Admin" },
} as const;

const documentsUrl = `${FIRESTORE}/v1/projects/${EMULATOR_PROJECT}/databases/(default)/documents`;
const ownerHeaders = { Authorization: "Bearer owner", "content-type": "application/json" };

export async function putAdmin(email: string, role: "owner" | "editor"): Promise<void> {
  const response = await fetch(`${documentsUrl}/admins/${encodeURIComponent(email)}`, {
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

export async function deleteAdmin(email: string): Promise<void> {
  await fetch(`${documentsUrl}/admins/${encodeURIComponent(email)}`, {
    method: "DELETE",
    headers: ownerHeaders,
  });
}
