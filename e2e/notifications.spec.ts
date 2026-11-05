import { expect, test, type Page, type Request } from "@playwright/test";

import { signInAs } from "./support/auth";
import { E2E_PORT, readFirestoreCollection, TEST_USERS } from "./support/emulator";

test.describe.configure({ mode: "serial" });

test.beforeEach(({}, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "Notification flows change shared data, so they run once.");
});

async function announcement(title: string) {
  const docs = await readFirestoreCollection("cms/root/notifications");
  return docs.find((doc) => doc.title === title) ?? null;
}

async function compose(page: Page, title: string, body: string) {
  await page.getByLabel("Title").fill(title);
  await page.getByLabel("Message").fill(body);
  await expect(page.getByRole("button", { name: "Send test" })).toBeDisabled();
  await page.getByRole("button", { name: "Save draft" }).click();
  await expect(page.getByText("Draft saved.").first()).toBeVisible();
}

test("an owner composes, confirms and sends to everyone", async ({ page }) => {
  await signInAs(page, TEST_USERS.owner, "/notifications");
  await expect(page.getByText("Emulator: nothing is really sent.")).toBeVisible();

  await page.getByLabel("Title").fill("Doors open at 8");
  await expect(page.getByLabel("Preview").getByText("Doors open at 8")).toHaveCount(2);
  await expect(page.getByRole("button", { name: "Send to everyone" })).toBeDisabled();
  await compose(page, "Doors open at 8", "Bring your ticket QR to the front desk.");

  await page.getByLabel("Message").fill("An unsaved change.");
  await expect(page.getByRole("button", { name: "Send to everyone" })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Send test" })).toBeDisabled();
  await page.getByLabel("Message").fill("Bring your ticket QR to the front desk.");

  await page.getByRole("button", { name: "Send test" }).click();
  await expect(page.getByText(/Test accepted by FCM/).first()).toBeVisible();
  expect(await announcement("Doors open at 8")).toMatchObject({ status: "draft", lastTestBy: TEST_USERS.owner.email });

  await page.getByRole("button", { name: "Send to everyone" }).click();
  const dialog = page.getByRole("alertdialog");
  await expect(dialog.getByText("Doors open at 8")).toBeVisible();
  await expect(dialog.getByText("Bring your ticket QR to the front desk.")).toBeVisible();
  await expect(dialog.getByText(/everyone who turned on announcements\. It can.t be recalled\./)).toBeVisible();
  const confirm = dialog.getByRole("button", { name: "Send to everyone" });
  await expect(confirm).not.toBeFocused();
  await confirm.click();
  await expect(page.getByText(/^Accepted by FCM\./).first()).toBeVisible();

  await expect.poll(async () => (await announcement("Doors open at 8"))?.status).toBe("sent");
  const sent = await announcement("Doors open at 8");
  expect(String(sent?.messageId)).toMatch(/^emulator\//);
  expect(sent?.sentBy).toBe(TEST_USERS.owner.email);
  await expect(
    page.getByRole("list", { name: "Announcements" }).getByRole("listitem").filter({ hasText: "Doors open at 8" }),
  ).toContainText("Accepted by FCM");
});

test("an editor can't send to everyone, even by replaying the request", async ({ page, browser }) => {
  await signInAs(page, TEST_USERS.owner, "/notifications");
  await compose(page, "Owner-only send", "Only an owner may send this.");

  let captured: Request | null = null;
  await page.route("**/notifications", async (route) => {
    if (route.request().method() === "POST" && route.request().postData()?.includes("allowRepeat")) {
      captured = route.request();
      await route.abort();
      return;
    }
    await route.continue();
  });
  await page.getByRole("button", { name: "Send to everyone" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Send to everyone" }).click();
  await expect.poll(() => captured).not.toBeNull();
  const action = captured as unknown as Request;
  await page.unroute("**/notifications");

  const editorContext = await browser.newContext();
  const editorPage = await editorContext.newPage();
  await signInAs(editorPage, TEST_USERS.editor, "/notifications");
  await editorPage
    .getByRole("list", { name: "Announcements" })
    .getByRole("button", { name: /Owner-only send/ })
    .click();
  await expect(editorPage.getByLabel("Title")).toHaveValue("Owner-only send");
  await expect(editorPage.getByRole("button", { name: "Send to everyone" })).toHaveCount(0);
  await expect(editorPage.getByText(/An owner needs to send this/)).toBeVisible();
  await expect(editorPage.getByRole("button", { name: "Send test" })).toBeEnabled();

  const headers = action.headers();
  const replay = await editorPage.request.post(`http://localhost:${E2E_PORT}/notifications`, {
    headers: {
      "next-action": headers["next-action"],
      "content-type": headers["content-type"],
      accept: headers.accept ?? "text/x-component",
      origin: `http://localhost:${E2E_PORT}`,
    },
    data: action.postData() ?? "",
  });
  expect(await replay.text()).toContain("Only owners can do this.");
  expect(await announcement("Owner-only send")).toMatchObject({ status: "draft" });
  await editorContext.close();
});

test("a sent announcement can't be edited, and a quick second send asks first", async ({ page }) => {
  await signInAs(page, TEST_USERS.owner, "/notifications");
  await page
    .getByRole("list", { name: "Announcements" })
    .getByRole("button", { name: /Doors open at 8/ })
    .click();
  await expect(page.getByText("Sent announcements can’t be changed.", { exact: false })).toBeVisible();
  await expect(page.getByLabel("Title")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Save draft" })).toHaveCount(0);

  await page.getByRole("button", { name: "Use as new draft" }).click();
  await expect(page.getByLabel("Title")).toHaveValue("Doors open at 8");
  await page.getByLabel("Title").fill("Doors open at 8, again");
  await page.getByRole("button", { name: "Save draft" }).click();
  await expect(page.getByText("Draft saved.").first()).toBeVisible();

  await page.getByRole("button", { name: "Send to everyone" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Send to everyone" }).click();
  const repeat = page.getByRole("alertdialog", { name: "Send another?" });
  await expect(repeat.getByText(/An announcement went out \d+ minutes? ago\. Send another\?/)).toBeVisible();
  await repeat.getByRole("button", { name: "Cancel" }).click();
  expect(await announcement("Doors open at 8, again")).toMatchObject({ status: "draft" });
  expect((await readFirestoreCollection("cms/root/notifications")).filter((doc) => doc.status === "sent")).toHaveLength(
    1,
  );
});
