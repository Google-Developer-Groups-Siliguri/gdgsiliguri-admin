import { expect, test } from "@playwright/test";

test.describe("component gallery", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/dev/components");
  });

  test("has no horizontal scroll", async ({ page }) => {
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });

  test("switch toggles with the keyboard", async ({ page }) => {
    const toggle = page.getByRole("switch", { name: "Enabled" }).first();
    await toggle.focus();
    await expect(toggle).toHaveAttribute("aria-checked", "true");
    await page.keyboard.press("Space");
    await expect(toggle).toHaveAttribute("aria-checked", "false");
  });

  test("segmented button moves selection with arrow keys", async ({ page }) => {
    const group = page.getByRole("radiogroup", { name: "Designation" }).first();
    const organizer = group.getByRole("radio", { name: "Organizer" });
    await organizer.focus();
    await page.keyboard.press("ArrowRight");
    await expect(group.getByRole("radio", { name: "Volunteer" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
  });

  test("date picker selects a date with the keyboard", async ({ page }) => {
    await page.getByRole("button", { name: "Choose Event date" }).first().click();
    const selected = page.getByRole("button", { name: "Sunday, November 16, 2025" });
    await expect(selected).toBeVisible();
    await selected.focus();
    await page.keyboard.press("ArrowRight");
    await expect(page.getByRole("button", { name: "Monday, November 17, 2025" })).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page.getByLabel("Event date").first()).toHaveValue("2025-11-17");
  });

  test("time picker writes hh:mm AM/PM", async ({ page }) => {
    await page.getByRole("button", { name: "Choose Start time" }).first().click();
    await page.getByLabel("Hour").fill("4");
    await page.getByLabel("Minute").fill("30");
    await page.getByRole("radio", { name: "PM" }).click();
    await page.getByRole("button", { name: "OK" }).click();
    await expect(page.getByLabel("Start time").first()).toHaveValue("04:30 PM");
  });

  test("url fix-it adds https", async ({ page }) => {
    await page.getByRole("button", { name: "Fix it" }).first().click();
    await expect(page.getByLabel("Twitter URL").first()).toHaveValue(
      "https://Twitter.com/debuisalive",
    );
  });

  test("dialog opens, traps focus and closes on Escape", async ({ page }) => {
    await page.getByRole("button", { name: "Full-screen dialog" }).first().click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
  });

  test("select opens and picks with the keyboard", async ({ page }) => {
    const trigger = page.getByRole("combobox", { name: "Track" }).first();
    await trigger.focus();
    await page.keyboard.press("Enter");
    await page.getByRole("option", { name: "Cloud" }).press("Enter");
    await expect(trigger).toContainText("Cloud");
  });

  test("menu opens from its icon button", async ({ page }) => {
    await page.getByRole("button", { name: "More" }).first().click();
    await expect(page.getByRole("menuitem", { name: "Delete" })).toBeVisible();
    await page.keyboard.press("Escape");
  });

  test("snackbar shows a message", async ({ page }) => {
    await page.getByRole("button", { name: "Snackbar", exact: true }).first().click();
    await expect(page.getByText("Published. The live site updates after a rebuild.")).toBeVisible();
  });
});
