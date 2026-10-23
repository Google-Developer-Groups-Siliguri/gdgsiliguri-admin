import { expect, type Page } from "@playwright/test";

export async function signInWithGoogle(page: Page, user: { email: string; name: string }) {
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

export async function signInAs(page: Page, user: { email: string; name: string }, path = "/") {
  await page.goto(path);
  await expect(page).toHaveURL(/\/login/);
  await signInWithGoogle(page, user);
  if (user.email === "outsider@example.com") return;
  await expect(page).toHaveURL(path, { timeout: 60_000 });
  await expect(page.getByRole("button", { name: `Account: ${user.email}` })).toBeVisible({ timeout: 60_000 });
}
