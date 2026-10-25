import { expect, test } from "@playwright/test";

import { signInAs } from "./support/auth";
import { readRtdb, TEST_USERS } from "./support/emulator";

function isMobile(width: number | undefined) {
  return (width ?? 1280) < 840;
}

test.describe("app shell", () => {
  test("navigates between sections", async ({ page, viewport }) => {
    await signInAs(page, TEST_USERS.owner);
    if (isMobile(viewport?.width)) {
      await page.getByRole("button", { name: "Open navigation" }).click();
      const drawer = page.getByRole("dialog", { name: "Navigation" });
      await drawer.getByRole("link", { name: "Team" }).click();
      await expect(drawer).toBeHidden();
    } else {
      await page
        .getByRole("navigation", { name: "Main" })
        .getByRole("link", { name: "Team" })
        .click();
    }
    await expect(page).toHaveURL("/community/team");
    await expect(page.getByRole("heading", { level: 1, name: "Team" })).toBeVisible();
    await expect(page.getByText("Debajit Mallick")).toBeVisible();
  });

  test("shows Admins only to owners", async ({ page, viewport }) => {
    await signInAs(page, TEST_USERS.editor);
    if (isMobile(viewport?.width)) {
      await page.getByRole("button", { name: "Open navigation" }).click();
    }
    const nav = page.getByRole("navigation", { name: "Main" }).last();
    await expect(nav.getByRole("link", { name: "Activity log" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Admins" })).toHaveCount(0);

    await page.goto("/settings/admins");
    await expect(page).toHaveURL("/");
  });

  test("owners see Admins", async ({ page, viewport }) => {
    await signInAs(page, TEST_USERS.owner);
    if (isMobile(viewport?.width)) {
      await page.getByRole("button", { name: "Open navigation" }).click();
    }
    await expect(
      page.getByRole("navigation", { name: "Main" }).last().getByRole("link", { name: "Admins" }),
    ).toBeVisible();
  });

  test("the theme choice survives a reload", async ({ page }) => {
    await signInAs(page, TEST_USERS.owner);
    await expect(page.locator("html")).not.toHaveAttribute("data-theme", /.+/);
    await page.getByRole("button", { name: "Switch to dark mode" }).click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await page.getByRole("button", { name: "Switch to light mode" }).click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  });

  test("signs out from the account menu", async ({ page }) => {
    await signInAs(page, TEST_USERS.owner);
    await page.getByRole("button", { name: `Account: ${TEST_USERS.owner.email}` }).click();
    await page.getByRole("menuitem", { name: "Sign out" }).click();
    await expect(page).toHaveURL("/login");
  });
});

test.describe("dashboard", () => {
  test("shows every section with its state", async ({ page }) => {
    await signInAs(page, TEST_USERS.owner);
    const sections = page.getByRole("region", { name: "Sections" });
    for (const name of ["Event details", "Schedule", "Speakers", "Sponsors", "Team", "Reviews", "Events"]) {
      await expect(sections.getByRole("link", { name, exact: true })).toBeVisible();
    }
    await expect(sections.getByText("21 items")).toBeVisible();
    await expect(page.getByRole("main").getByText("DevFest Siliguri")).toBeVisible();
  });

  test("quick toggle turns a section off and on after confirming", async ({ page }) => {
    await signInAs(page, TEST_USERS.owner);
    const toggle = page.getByRole("switch", { name: "Show Reviews on the website" });
    await expect(toggle).toBeChecked();

    await toggle.click();
    const dialog = page.getByRole("alertdialog", { name: "Turn Reviews off?" });
    await dialog.getByRole("button", { name: "Turn off" }).click();
    await expect(page.getByText("Reviews turned off.", { exact: false }).first()).toBeVisible();
    await expect(toggle).not.toBeChecked();
    await expect.poll(() => readRtdb("feedbacks/enabled")).toBe(false);

    await toggle.click();
    await page.getByRole("alertdialog").getByRole("button", { name: "Turn on" }).click();
    await expect(toggle).toBeChecked();
    await expect.poll(() => readRtdb("feedbacks/enabled")).toBe(true);
  });

  test("cancelling the confirmation changes nothing", async ({ page }) => {
    await signInAs(page, TEST_USERS.owner);
    const toggle = page.getByRole("switch", { name: "Show Team on the website" });
    await toggle.click();
    await page.getByRole("alertdialog").getByRole("button", { name: "Cancel" }).click();
    await expect(toggle).toBeChecked();
    expect(await readRtdb("teams/enabled")).toBe(true);
  });
});

test.describe("section header", () => {
  test("opens the revision list of a section", async ({ page }) => {
    await signInAs(page, TEST_USERS.owner, "/community/team");
    await page.getByRole("button", { name: "History" }).click();
    const sheet = page.getByRole("dialog", { name: "Team history" });
    await expect(sheet.getByText("Imported from /teams")).toBeVisible();
    await expect(sheet.getByText("Live")).toBeVisible();
  });

  test("publishing an unchanged section is not offered", async ({ page }) => {
    await signInAs(page, TEST_USERS.owner, "/devfest/faq");
    await expect(page.getByRole("button", { name: "Publish" })).toBeDisabled();
    await expect(page.getByRole("button", { name: "Discard" })).toBeDisabled();
  });
});
