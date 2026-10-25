import { expect, test, type Request } from "@playwright/test";

import { signInAs } from "./support/auth";
import { E2E_PORT, readFirestoreDoc, TEST_USERS } from "./support/emulator";

test.beforeEach(({}, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "Settings flows change shared data, so they run once.");
});

test("owners add, promote, demote and remove admins", async ({ page }) => {
  await signInAs(page, TEST_USERS.owner, "/settings/admins");
  await expect(page.getByRole("list", { name: "Admins" }).getByText(TEST_USERS.editor.email)).toBeVisible();

  await page.getByRole("button", { name: "Add admin" }).click();
  const dialog = page.getByRole("dialog", { name: "Add admin" });
  await dialog.getByLabel("Google account email").fill(TEST_USERS.editor.email);
  await dialog.getByRole("button", { name: "Add", exact: true }).click();
  await expect(dialog.getByText(`${TEST_USERS.editor.email} is already an admin.`)).toBeVisible();

  await dialog.getByLabel("Google account email").fill("New.Volunteer@Example.com");
  await dialog.getByRole("button", { name: "Add", exact: true }).click();
  await expect(dialog).toBeHidden();
  const row = page.getByRole("list", { name: "Admins" }).getByRole("listitem").filter({ hasText: "new.volunteer@example.com" });
  await expect(row).toBeVisible();
  expect(await readFirestoreDoc("admins/new.volunteer@example.com")).toMatchObject({ role: "editor" });

  await row.getByRole("combobox", { name: "Role" }).click();
  await page.getByRole("option", { name: "Owner" }).click();
  await expect(page.getByText("new.volunteer@example.com is now an owner.").first()).toBeVisible();
  expect(await readFirestoreDoc("admins/new.volunteer@example.com")).toMatchObject({ role: "owner" });

  await row.getByRole("button", { name: "Remove new.volunteer@example.com" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Remove" }).click();
  await expect(page.getByText("new.volunteer@example.com was removed.").first()).toBeVisible();
  await expect(row).toBeHidden();
  await expect.poll(() => readFirestoreDoc("admins/new.volunteer@example.com")).toBeNull();
});

test("the last owner cannot be demoted", async ({ page }) => {
  await signInAs(page, TEST_USERS.owner, "/settings/admins");
  const row = page.getByRole("list", { name: "Admins" }).getByRole("listitem").filter({ hasText: TEST_USERS.owner.email });
  await expect(row.getByRole("button", { name: `Remove ${TEST_USERS.owner.email}` })).toBeDisabled();
  await row.getByRole("combobox", { name: "Role" }).click();
  await page.getByRole("option", { name: "Editor" }).click();
  await expect(page.getByText("There must always be at least one owner.").first()).toBeVisible();
  expect(await readFirestoreDoc(`admins/${TEST_USERS.owner.email}`)).toMatchObject({ role: "owner" });
});

test("an editor cannot run admin actions even by replaying the request", async ({ page, browser }) => {
  await signInAs(page, TEST_USERS.owner, "/settings/admins");
  let captured: Request | null = null;
  page.on("request", (request) => {
    if (request.method() === "POST" && request.headers()["next-action"]) captured = request;
  });
  await page.getByRole("button", { name: "Add admin" }).click();
  const dialog = page.getByRole("dialog", { name: "Add admin" });
  await dialog.getByLabel("Google account email").fill("captured@example.com");
  await dialog.getByRole("button", { name: "Add", exact: true }).click();
  await expect(dialog).toBeHidden();
  expect(captured).not.toBeNull();
  const action = captured as unknown as Request;
  expect(await readFirestoreDoc("admins/captured@example.com")).toMatchObject({ role: "editor" });

  const editorContext = await browser.newContext();
  const editorPage = await editorContext.newPage();
  await signInAs(editorPage, TEST_USERS.editor);
  const headers = action.headers();
  const replay = await editorPage.request.post(`http://localhost:${E2E_PORT}/settings/admins`, {
    headers: {
      "next-action": headers["next-action"],
      "content-type": headers["content-type"],
      accept: headers.accept ?? "text/x-component",
      origin: `http://localhost:${E2E_PORT}`,
    },
    data: action.postData()?.replace("captured@example.com", "sneaky@example.com") ?? "",
  });
  expect(await replay.text()).toContain("Only owners can do this.");
  expect(await readFirestoreDoc("admins/sneaky@example.com")).toBeNull();

  await editorPage.goto("/settings/admins");
  await expect(editorPage).toHaveURL("/");
  await editorContext.close();
});

test("publishing goes live without a rebuild step", async ({ page }) => {
  await signInAs(page, TEST_USERS.owner, "/community/reviews");
  await page.getByRole("button", { name: /^More actions for/ }).first().click();
  await page.getByRole("menuitem", { name: "Move down" }).click();
  await page.getByRole("button", { name: "Publish" }).click();
  await expect(page.getByText("Reviews published. It's live on gdgsiliguri.com.").first()).toBeVisible();
  await expect(page.getByRole("link", { name: /Rebuild/ })).toHaveCount(0);
  const response = await page.goto("/settings/rebuild");
  expect(response?.status()).toBe(404);
});

test("the activity log filters by section and person", async ({ page }) => {
  await signInAs(page, TEST_USERS.owner, "/settings/activity");
  await page.getByRole("combobox", { name: "Section" }).click();
  await page.getByRole("option", { name: "Reviews" }).click();
  await expect(page).toHaveURL(/section=feedbacks/);
  await expect(page.getByText(/Published Reviews/).first()).toBeVisible();
  await expect(page.getByText("Added new.volunteer@example.com as editor")).toHaveCount(0);

  await page.getByRole("combobox", { name: "Section" }).click();
  await page.getByRole("option", { name: "All sections" }).click();
  await page.getByRole("combobox", { name: "Person" }).click();
  await page.getByRole("option", { name: TEST_USERS.owner.email }).click();
  await expect(page).toHaveURL(/actor=owner%40example.com/);
  await expect(page.getByText(/Published Reviews/).first()).toBeVisible();
  await expect(page.getByText(`${TEST_USERS.owner.email} ·`).first()).toBeVisible();
});
