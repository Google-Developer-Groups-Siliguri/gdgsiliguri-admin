import { expect, test } from "@playwright/test";

import { signInAs } from "./support/auth";
import { E2E_PORT, readFirestoreDoc, TEST_USERS } from "./support/emulator";

type Json = Record<string, unknown>;

test.beforeEach(({}, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "Feature flows change shared data, so they run once.");
});

test("modules: a cards module with two items reaches bundles/home", async ({ page }) => {
  await signInAs(page, TEST_USERS.owner, "/modules");
  await page.getByRole("button", { name: "Add module" }).click();
  const dialog = page.getByRole("dialog", { name: "Add module" });
  await dialog.getByRole("textbox", { name: "Title", exact: true }).fill("Study Jams");
  await dialog.getByRole("switch", { name: "Enabled" }).click();
  await dialog.getByRole("button", { name: "Add", exact: true }).click();
  await expect(dialog).toBeHidden();
  await page.getByRole("button", { name: "Publish", exact: true }).click();
  await expect(page.getByText("Modules published.", { exact: false }).first()).toBeVisible();

  await page.goto("/modules/study-jams");
  for (const title of ["Week 1: Gemini", "Week 2: Agents"]) {
    await page.getByRole("button", { name: "Add card" }).click();
    const card = page.getByRole("dialog", { name: "Add card" });
    await card.getByRole("textbox", { name: "Title", exact: true }).fill(title);
    await card.getByRole("button", { name: "Add", exact: true }).click();
    await expect(card).toBeHidden();
  }
  await page.getByRole("button", { name: "Publish", exact: true }).click();
  await expect(page.getByText("Study Jams published.", { exact: false }).first()).toBeVisible();
  const home = (await readFirestoreDoc("bundles/home")) as { modules: { id: string; items: Json[] }[] };
  expect(home.modules.find((entry) => entry.id === "study-jams")?.items).toHaveLength(2);
});

test("showcase: an ingested project is approved into the 2025 bundle", async ({ page, request }) => {
  await signInAs(page, TEST_USERS.owner, "/settings/showcase");
  await page.getByRole("button", { name: /a secret/ }).click();
  const secret = (await page.getByLabel("New secret").textContent())?.trim() ?? "";
  expect(secret.length).toBeGreaterThan(20);
  await page.getByRole("switch", { name: "Accepting submissions" }).click();
  await expect(page.getByText("Submissions are open.").first()).toBeVisible();

  const submission = {
    title: "KrishiMitra",
    summary: "Identifies tea leaf diseases from a photo.",
    team: [{ name: "Priya Sharma" }],
    email: "priya@example.com",
    edition: 2025,
    consent: true,
  };
  const denied = await request.post(`http://localhost:${E2E_PORT}/api/showcase/ingest`, {
    headers: { "x-ingest-secret": "wrong" },
    data: submission,
  });
  expect(denied.status()).toBe(403);
  const accepted = await request.post(`http://localhost:${E2E_PORT}/api/showcase/ingest`, {
    headers: { "x-ingest-secret": secret },
    data: submission,
  });
  expect(await accepted.json()).toMatchObject({ ok: true });

  await page.goto("/community/showcase");
  await page.getByRole("button", { name: /KrishiMitra/ }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Approve" }).click();
  await expect(page.getByText("Approved and published.").first()).toBeVisible();
  const bundle = (await readFirestoreDoc("bundles/edition-2025")) as { showcase: Json[] };
  expect(bundle.showcase.map((item) => item.title)).toContain("KrishiMitra");
  expect(JSON.stringify(bundle)).not.toContain("priya@example.com");
});

test("an editor can't open App settings, Admins or the showcase form", async ({ page }) => {
  await signInAs(page, TEST_USERS.editor);
  for (const path of ["/settings/app", "/settings/admins", "/settings/showcase"]) {
    await page.goto(path);
    await expect(page).toHaveURL("/");
  }
});

test("app settings: an owner raises the minimum build after confirming", async ({ page }) => {
  await signInAs(page, TEST_USERS.owner, "/settings/app");
  await page.getByLabel("Latest build").fill("4100");
  await page.getByLabel("Minimum supported build").fill("4100");
  await page.getByRole("alertdialog").getByRole("button", { name: "Raise it" }).click();
  await page.getByRole("button", { name: "Publish", exact: true }).click();
  await expect(page.getByText("App settings published.", { exact: false }).first()).toBeVisible();
  expect(await readFirestoreDoc("site/app")).toMatchObject({ minSupportedBuild: 4100, latestBuild: 4100 });
});
