import { expect, type Page } from "@playwright/test";

import { E2E_PORT } from "./emulator";

type TestUser = { email: string; name: string };

const AUTH_EMULATOR = "http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1";

export async function signInWithGoogle(page: Page, user: TestUser) {
  const [popup] = await Promise.all([
    page.waitForEvent("popup"),
    page.getByRole("button", { name: "Sign in with Google" }).click(),
  ]);
  await popup.waitForLoadState();
  const closed = popup.waitForEvent("close");
  const existing = popup.getByText(user.email, { exact: true });
  if (await existing.isVisible().catch(() => false)) {
    await existing.click();
  } else {
    await popup.getByRole("button", { name: "Add new account" }).click();
    const inputs = popup.locator("input");
    await inputs.nth(0).fill(user.email);
    await inputs.nth(1).fill(user.name);
    await popup.getByRole("button", { name: "Sign in with Google.com" }).click();
  }
  await closed;
}

export async function signInAsViaPopup(page: Page, user: TestUser, path = "/") {
  await page.goto(path);
  await expect(page).toHaveURL(/\/login/);
  await signInWithGoogle(page, user);
  if (user.email === "outsider@example.com") return;
  await expect(page).toHaveURL(path, { timeout: 60_000 });
  await expect(page.getByRole("button", { name: `Account: ${user.email}` })).toBeVisible({
    timeout: 60_000,
  });
}

async function emulatorGoogleIdToken(user: TestUser): Promise<string> {
  const claims = JSON.stringify({
    sub: `google-${user.email}`,
    email: user.email,
    email_verified: true,
    name: user.name,
  });
  const response = await fetch(`${AUTH_EMULATOR}/accounts:signInWithIdp?key=demo-api-key`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      postBody: `id_token=${encodeURIComponent(claims)}&providerId=google.com`,
      requestUri: `http://localhost:${E2E_PORT}`,
      returnSecureToken: true,
    }),
  });
  const body = (await response.json()) as { idToken?: string };
  if (!body.idToken) throw new Error(`Auth emulator sign-in failed: ${JSON.stringify(body)}`);
  return body.idToken;
}

export async function signInAs(page: Page, user: TestUser, path = "/") {
  const idToken = await emulatorGoogleIdToken(user);
  const response = await page.request.post("/api/session", {
    headers: { origin: `http://localhost:${E2E_PORT}` },
    data: { idToken },
  });
  expect(response.ok(), await response.text()).toBe(true);
  await page.goto(path);
  await expect(page).toHaveURL(path, { timeout: 60_000 });
  await expect(page.getByRole("button", { name: `Account: ${user.email}` })).toBeVisible({
    timeout: 60_000,
  });
}
