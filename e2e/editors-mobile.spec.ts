import { expect, test } from "@playwright/test";

import { signInAs } from "./support/auth";
import { readRtdb, TEST_USERS } from "./support/emulator";

test.beforeEach(({}, testInfo) => {
  test.skip(testInfo.project.name !== "mobile", "Phone-only flow.");
});

test("adds a review on a phone with the full-screen editor", async ({ page }) => {
  await signInAs(page, TEST_USERS.owner, "/community/reviews");
  await page.getByRole("button", { name: "Add review" }).click();
  const dialog = page.getByRole("dialog", { name: "Add review" });
  await expect(dialog).toBeVisible();
  const box = await dialog.boundingBox();
  expect(box?.width).toBe(360);

  await dialog.getByLabel("Name").fill("Priya Sharma");
  await dialog.getByLabel("Event attended").fill("@Devfest'25");
  await dialog.getByLabel("Title").fill("Loved the workshops");
  await dialog.getByLabel("Review").fill("Great sessions and friendly volunteers.");
  await dialog.getByRole("button", { name: "Add", exact: true }).first().click();
  await expect(dialog).toBeHidden();

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);

  await page.getByRole("button", { name: "Publish", exact: true }).click();
  await expect(page.getByText("Reviews published. It's live on gdgsiliguri.com.").first()).toBeVisible();
  const live = (await readRtdb("feedbacks/data")) as Record<string, unknown>[];
  expect(live[live.length - 1]).toEqual({
    name: "Priya Sharma",
    eventAttended: "@Devfest'25",
    feedbackTitle: "Loved the workshops",
    feedbackDescription: "Great sessions and friendly volunteers.",
  });
});
