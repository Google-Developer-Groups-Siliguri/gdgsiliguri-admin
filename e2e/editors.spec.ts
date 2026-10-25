import { expect, test, type Page } from "@playwright/test";

import { signInAs } from "./support/auth";
import { readRtdb, TEST_USERS } from "./support/emulator";

type Json = Record<string, unknown>;

test.beforeEach(({}, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "Editor flows change shared data, so they run once.");
});

async function openEditor(page: Page, path: string) {
  await signInAs(page, TEST_USERS.owner, path);
  await expect(page.getByRole("button", { name: "Publish", exact: true })).toBeVisible();
}

async function publish(page: Page, label: string) {
  await page.getByRole("button", { name: "Publish", exact: true }).click();
  await expect(page.getByText(`${label} published. It's live on gdgsiliguri.com.`).first()).toBeVisible();
}

function rows(page: Page) {
  return page.getByRole("list").filter({ has: page.getByRole("button", { name: /^Reorder / }) }).first();
}

test("team: add, edit, reorder, delete, fix a link and publish", async ({ page }) => {
  await openEditor(page, "/community/team");
  await expect(page.getByRole("main").getByText("1 problem to fix before publishing")).toBeVisible();
  await expect(page.getByRole("button", { name: "Publish", exact: true })).toBeDisabled();

  await page.getByRole("button", { name: "Add member" }).click();
  const dialog = page.getByRole("dialog", { name: "Add member" });
  await dialog.getByLabel("Name").fill("Ada Lovelace");
  await dialog.getByRole("radio", { name: "Organizer" }).click();
  await dialog.getByLabel("Role and company").fill("Analyst @Engines");
  await dialog.getByRole("textbox", { name: "Profile picture URL" }).fill("https://ik.imagekit.io/gdgsiliguri1/teams/ada.png");
  await dialog.getByRole("button", { name: "Add", exact: true }).click();
  await expect(dialog).toBeHidden();

  await page.getByRole("button", { name: "Edit Sourav Das" }).click();
  const edit = page.getByRole("dialog", { name: "Edit member" });
  await edit.getByLabel("Role and company").fill("Engineering Manager @AppyPies");
  await edit.getByRole("button", { name: "Done" }).click();

  await page.getByRole("button", { name: "Edit Debajyoti Sarkar" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Fix it" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Done" }).click();
  await expect(page.getByText("problem to fix before publishing")).toBeHidden();

  const announcer = page.locator('[id^="DndLiveRegion"]').first();
  await page.getByRole("button", { name: "Reorder Debajit Mallick" }).focus();
  await page.keyboard.press("Space");
  await expect(announcer).toContainText("Position 1 of 22.");
  await page.keyboard.press("ArrowDown");
  await expect(announcer).toContainText("Position 2 of 22.");
  await page.keyboard.press("Space");
  await expect(announcer).toContainText("Dropped at position 2");
  await expect(rows(page).getByRole("listitem").nth(0)).toContainText("Sourav Das");
  await expect(rows(page).getByRole("listitem").nth(1)).toContainText("Debajit Mallick");

  await page.getByRole("button", { name: "More actions for Rounak Pramanik" }).click();
  await page.getByRole("menuitem", { name: "Delete" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Delete" }).click();

  await page.getByRole("button", { name: "Save draft" }).click();
  await expect(page.getByText("Draft saved. The live site is unchanged.").first()).toBeVisible();
  expect(((await readRtdb("teams/data")) as Json[]).length).toBe(21);

  await publish(page, "Team");
  const live = (await readRtdb("teams/data")) as Json[];
  expect(live).toHaveLength(21);
  expect(live[0].name).toBe("Sourav Das");
  expect(live[0].description).toBe("Engineering Manager @AppyPies");
  expect(live[1].name).toBe("Debajit Mallick");
  expect(live.map((member) => member.name)).not.toContain("Rounak Pramanik");
  expect(live[live.length - 1]).toEqual({
    name: "Ada Lovelace",
    designation: "Organizer",
    description: "Analyst @Engines",
    profilePictureURL: "https://ik.imagekit.io/gdgsiliguri1/teams/ada.png",
    githubURL: "",
    linkedInURL: "",
    twitterURL: "",
  });
  const debajyoti = live.find((member) => member.name === "Debajyoti Sarkar");
  expect(debajyoti?.twitterURL).toBe("https://Twitter.com/debuisalive");
  await expect(page.getByText("version 2")).toBeVisible();
});

test("faq: a new question needs both fields and publishes", async ({ page }) => {
  await openEditor(page, "/devfest/faq");
  await page.getByRole("button", { name: "Add question" }).click();
  const dialog = page.getByRole("dialog", { name: "Add question" });
  await dialog.getByRole("button", { name: "Add", exact: true }).click();
  await expect(dialog.getByText("Question is required")).toBeVisible();
  await dialog.getByLabel("Question").fill("Is there parking at the venue?");
  await dialog.getByLabel("Answer").fill("Yes, free parking is available.");
  await dialog.getByRole("button", { name: "Add", exact: true }).click();
  await publish(page, "DevFest FAQ");
  const live = (await readRtdb("FAQs/data")) as Json[];
  expect(live).toHaveLength(18);
  expect(live[17]).toEqual({ question: "Is there parking at the venue?", answer: "Yes, free parking is available." });
});

test("sponsors: move a sponsor to another tier", async ({ page }) => {
  await openEditor(page, "/devfest/sponsors");
  await page.getByRole("tab", { name: /Gold/ }).click();
  await page.getByRole("button", { name: "More actions for Rise in" }).click();
  await page.getByRole("menuitem", { name: "Move to Silver" }).click();
  await expect(page.getByRole("tab", { name: "Silver (1)" })).toBeVisible();
  await publish(page, "Sponsors");
  const live = (await readRtdb("sponsors")) as Record<string, Json[]>;
  expect(live.gold).toHaveLength(2);
  expect(live.silver.map((sponsor) => sponsor.sponsorName)).toEqual(["Rise in"]);
  expect(live.platinum).toHaveLength(1);
});

test("schedule: fixing the AM/PM slip clears the warning and keeps a string duration", async ({ page }) => {
  await openEditor(page, "/devfest/schedule");
  await expect(page.getByText("Starts earlier than the slot above it. Check AM/PM or the order.")).toBeVisible();
  await page.getByRole("button", { name: "Edit Panel Discussion" }).first().click();
  const dialog = page.getByRole("dialog", { name: "Edit slot" });
  await dialog.getByRole("textbox", { name: "Starts" }).fill("12:10 PM");
  await dialog.getByRole("textbox", { name: "Ends" }).fill("12:40 PM");
  await expect(dialog.getByText("30 minutes")).toBeVisible();
  await dialog.getByRole("button", { name: "Done" }).click();
  await expect(page.getByText("Starts earlier than the slot above it. Check AM/PM or the order.")).toBeHidden();

  await page.getByRole("button", { name: "Add slot" }).click();
  const added = page.getByRole("dialog", { name: "Add slot" });
  await added.getByLabel("Title").fill("Closing photo");
  await added.getByRole("textbox", { name: "Ends" }).fill("06:00 PM");
  await expect(added.getByText("30 minutes")).toBeVisible();
  await added.getByRole("button", { name: "Add", exact: true }).click();
  await expect(added).toBeHidden();

  await publish(page, "Schedule");
  const slots = (await readRtdb("schedule/data")) as Json[];
  expect(slots[4]).toMatchObject({ startTime: "12:10 PM", endTime: "12:40 PM", durationInMins: "30" });
  expect(slots.at(-1)).toMatchObject({ title: "Closing photo", startTime: "05:30 PM", endTime: "06:00 PM", durationInMins: "30" });
});

test("event details: edit fields across tabs and publish the exact shape", async ({ page }) => {
  await openEditor(page, "/devfest/event-details");
  const main = page.getByRole("main");
  await page.getByRole("tab", { name: "Venue" }).click();
  await main.getByLabel("Venue name").fill("Siliguri Convention Centre");
  await page.getByRole("tab", { name: "Perks" }).click();
  await page.getByRole("textbox", { name: "Perk 1" }).fill("Hands-on workshops");
  await page.getByRole("tab", { name: "Points to note" }).click();
  await page.getByRole("switch", { name: "Show points to note" }).click();
  await publish(page, "Event details");
  const live = (await readRtdb("eventDetails")) as Record<string, Record<string, unknown>>;
  expect(live.eventVenue.name).toBe("Siliguri Convention Centre");
  expect((live.perks.data as string[])[0]).toBe("Hands-on workshops");
  expect(live.pointsToNote.enabled).toBe(false);
  expect(live.eventMode).toBe(true);
  expect(live.frames).toBeTruthy();
  expect(live.eventDateTime).toBe("2025-11-16 08:00:00.000");
});

test("events: create the first event, publish it and turn the section on", async ({ page }) => {
  await openEditor(page, "/community/events");
  expect(await readRtdb("events")).toBeNull();
  await page.getByRole("button", { name: "Add event" }).click();
  const dialog = page.getByRole("dialog", { name: "Add event" });
  await dialog.getByLabel("Name").fill("Build with AI Siliguri");
  await expect(dialog.getByLabel("Id")).toHaveValue("build-with-ai-siliguri");
  await dialog.getByLabel("Tagline").fill("Hands-on with Gemini");
  await dialog.getByRole("button", { name: "Add speaker" }).click();
  await dialog.getByLabel("Name").nth(1).fill("Debajit Mallick");
  await dialog.getByRole("button", { name: "Add", exact: true }).click();
  await expect(dialog).toBeHidden();

  await publish(page, "Events");
  const events = (await readRtdb("events")) as { enabled: boolean; data: Json[] };
  expect(events.enabled).toBe(false);
  expect(events.data[0]).toMatchObject({
    id: "build-with-ai-siliguri",
    name: "Build with AI Siliguri",
    tagline: "Hands-on with Gemini",
    speakers: [{ name: "Debajit Mallick", imageUrl: "", description: "" }],
  });

  await page.getByRole("switch", { name: "Show Events on the website" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Turn on" }).click();
  await expect.poll(() => readRtdb("events/enabled")).toBe(true);
});

test("leaving with unsaved changes asks first", async ({ page }) => {
  await openEditor(page, "/community/reviews");
  await page.getByRole("button", { name: "More actions for" }).first().click();
  await page.getByRole("menuitem", { name: "Duplicate" }).click();
  await page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Dashboard" }).click();
  const guard = page.getByRole("alertdialog", { name: "Leave without saving?" });
  await expect(guard).toBeVisible();
  await guard.getByRole("button", { name: "Cancel" }).click();
  await expect(page).toHaveURL("/community/reviews");
  await page.getByRole("button", { name: "Discard", exact: true }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Discard", exact: true }).click();
  await page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Dashboard" }).click();
  await expect(page).toHaveURL("/");
});

test("an enabled section cannot be emptied until it is turned off", async ({ page }) => {
  await openEditor(page, "/community/faq");
  for (let index = 0; index < 3; index += 1) {
    await page.getByRole("button", { name: /^More actions for/ }).first().click();
    await page.getByRole("menuitem", { name: "Delete" }).click();
    await page.getByRole("alertdialog").getByRole("button", { name: "Delete" }).click();
  }
  const emptyMessage = page.getByText("Home FAQ has no items. Add at least one, or turn the section off instead.");
  await expect(emptyMessage).toBeVisible();
  await expect(page.getByRole("button", { name: "Publish", exact: true })).toBeDisabled();

  await page.getByRole("switch", { name: "Show Home FAQ on the website" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Turn off" }).click();
  await expect(emptyMessage).toBeHidden();
  await publish(page, "Home FAQ");
  expect(await readRtdb("home/gdgFAQs")).toEqual({ enabled: false });
});
