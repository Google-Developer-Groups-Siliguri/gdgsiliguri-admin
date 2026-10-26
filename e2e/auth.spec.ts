import { expect, test } from "@playwright/test";

import { openAccountMenu, signInAsViaPopup as signInAs, signInWithGoogle } from "./support/auth";
import { TEST_USERS } from "./support/emulator";

test.describe("authentication", () => {
  test("protected routes redirect to the login page", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL("/login");
    await page.goto("/devfest/schedule");
    await expect(page).toHaveURL("/login?next=%2Fdevfest%2Fschedule");
  });

  test("protected API routes answer 401 without a session", async ({ request }) => {
    const response = await request.get("/api/anything");
    expect(response.status()).toBe(401);
  });

  test("an owner can sign in and out", async ({ page, context }) => {
    await signInAs(page, TEST_USERS.owner);
    await expect(page.getByRole("heading", { level: 1, name: "Dashboard" })).toBeVisible();
    await openAccountMenu(page, TEST_USERS.owner.email);
    await expect(page.getByRole("menu").getByText("owner", { exact: true })).toBeVisible();
    await page.keyboard.press("Escape");

    const session = (await context.cookies()).find((cookie) => cookie.name === "__session");
    expect(session?.httpOnly).toBe(true);
    expect(session?.sameSite).toBe("Lax");

    await openAccountMenu(page, TEST_USERS.owner.email);
    await page.getByRole("menuitem", { name: "Sign out" }).click();
    await expect(page).toHaveURL("/login");
    await page.goto("/");
    await expect(page).toHaveURL("/login");
  });

  test("an editor signs in with the editor role", async ({ page }) => {
    await signInAs(page, TEST_USERS.editor);
    await openAccountMenu(page, TEST_USERS.editor.email);
    await expect(page.getByRole("menu").getByText("editor", { exact: true })).toBeVisible();
  });

  test("sign-in returns to the page that was requested", async ({ page }) => {
    await page.goto("/devfest/2026/schedule");
    await signInWithGoogle(page, TEST_USERS.owner);
    await expect(page).toHaveURL("/devfest/2026/schedule");
    await expect(page.getByRole("heading", { level: 1, name: "Schedule" })).toBeVisible();
  });

  test("someone who is not an admin is turned away", async ({ page, context }) => {
    await signInAs(page, TEST_USERS.outsider);
    await expect(page.getByRole("heading", { name: "You are not an admin" })).toBeVisible();
    await expect(page.getByText("Ask an organizer to add you")).toBeVisible();
    const session = (await context.cookies()).find((cookie) => cookie.name === "__session");
    expect(session).toBeUndefined();
    await page.goto("/");
    await expect(page).toHaveURL("/login");
  });

  test("the session endpoint rejects cross-site requests", async ({ request }) => {
    const response = await request.post("/api/session", {
      headers: { origin: "https://evil.example" },
      data: { idToken: "x" },
    });
    expect(response.status()).toBe(403);
  });

  test("a forged session cookie is not accepted", async ({ page, context }) => {
    await context.addCookies([
      { name: "__session", value: "forged", domain: "localhost", path: "/" },
    ]);
    await page.goto("/");
    await expect(page).toHaveURL("/login");
  });
});
