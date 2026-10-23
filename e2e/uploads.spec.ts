import { expect, test } from "@playwright/test";

import { signInAs } from "./support/auth";
import { E2E_PORT, TEST_USERS } from "./support/emulator";

const ORIGIN = `http://localhost:${E2E_PORT}`;
const UPLOADED = "https://ik.imagekit.io/gdgsiliguri1/teams/new-face_x1y2.png";

test.beforeEach(({}, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "Upload checks run once.");
});

test("uploading an image fills the field with the hosted URL", async ({ page }) => {
  let sent: { kind: string | null; hasFile: boolean } | null = null;
  await page.route("**/api/upload", async (route) => {
    const body = route.request().postDataBuffer()?.toString("latin1") ?? "";
    sent = { kind: /name="kind"\r\n\r\n(\w+)/.exec(body)?.[1] ?? null, hasFile: body.includes('filename="face.png"') };
    await route.fulfill({ json: { url: UPLOADED } });
  });

  await signInAs(page, TEST_USERS.owner, "/community/team");
  await page.getByRole("button", { name: "Add member" }).click();
  const dialog = page.getByRole("dialog", { name: "Add member" });
  await dialog.getByLabel("Upload Profile picture URL").setInputFiles({
    name: "face.png",
    mimeType: "image/png",
    buffer: Buffer.from([0x89, 0x50, 0x4e, 0x47]),
  });
  await expect(dialog.getByRole("textbox", { name: "Profile picture URL" })).toHaveValue(UPLOADED);
  expect(sent).toEqual({ kind: "team", hasFile: true });
});

test("files that are not images are refused in the browser", async ({ page }) => {
  let called = false;
  await page.route("**/api/upload", (route) => {
    called = true;
    return route.abort();
  });
  await signInAs(page, TEST_USERS.owner, "/devfest/sponsors");
  await page.getByRole("button", { name: "Add platinum sponsor" }).click();
  await page.getByLabel("Upload Logo URL").setInputFiles({
    name: "contract.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from("%PDF-1.4"),
  });
  await expect(page.getByText("Upload a PNG, JPEG, WebP, GIF or SVG image.").first()).toBeVisible();
  expect(called).toBe(false);
});

test("the upload endpoint refuses requests before contacting ImageKit", async ({ page, request }) => {
  const anonymous = await request.post("/api/upload", {
    headers: { origin: ORIGIN },
    multipart: { kind: "team", file: { name: "a.png", mimeType: "image/png", buffer: Buffer.from("x") } },
  });
  expect(anonymous.status()).toBe(401);

  await signInAs(page, TEST_USERS.editor);
  const crossSite = await page.request.post("/api/upload", {
    headers: { origin: "https://evil.example" },
    multipart: { kind: "team", file: { name: "a.png", mimeType: "image/png", buffer: Buffer.from("x") } },
  });
  expect(crossSite.status()).toBe(403);

  const notAnImage = await page.request.post("/api/upload", {
    headers: { origin: ORIGIN },
    multipart: { kind: "team", file: { name: "a.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF") } },
  });
  expect([415, 503]).toContain(notAnImage.status());

  const badKind = await page.request.post("/api/upload", {
    headers: { origin: ORIGIN },
    multipart: { kind: "../../secrets", file: { name: "a.png", mimeType: "image/png", buffer: Buffer.from("x") } },
  });
  expect([400, 503]).toContain(badKind.status());
});
