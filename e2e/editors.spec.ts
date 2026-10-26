import { expect, test, type Page } from "@playwright/test";

import { signInAs } from "./support/auth";
import { readFirestoreDoc, readRtdb, TEST_USERS } from "./support/emulator";

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
  await expect(page.getByText(`${label} published.`, { exact: false }).first()).toBeVisible();
}

async function toggle(page: Page, label: string, on: boolean) {
  await page.getByRole("switch", { name: `Show ${label} on the website` }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: on ? "Turn on" : "Turn off" }).click();
  await expect(page.getByText(`${label} turned ${on ? "on" : "off"}.`).first()).toBeVisible();
}

function rows(page: Page) {
  return page.getByRole("list").filter({ has: page.getByRole("button", { name: /^Reorder / }) }).first();
}

test("team: add, edit, reorder, delete, fix a link and publish", async ({ page }) => {
  await openEditor(page, "/community/team");
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
  const twitter = page.getByRole("dialog").getByRole("textbox", { name: "X / Twitter" });
  await twitter.fill("Twitter.com/debuisalive");
  await twitter.blur();
  await page.getByRole("dialog").getByRole("button", { name: "Fix it" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Done" }).click();
  await expect(page.getByRole("dialog")).toBeHidden();

  const announcer = page.locator('[id^="DndLiveRegion"]').first();
  await page.getByRole("button", { name: "Reorder Debajit Mallick" }).focus();
  await page.keyboard.press("Space");
  await expect(announcer).toContainText("Position 1 of 20.");
  await page.keyboard.press("ArrowDown");
  await expect(announcer).toContainText("Position 2 of 20.");
  await page.keyboard.press("Space");
  await expect(announcer).toContainText("Dropped at position 2");
  await expect(rows(page).getByRole("listitem").nth(0)).toContainText("Sourav Das");

  await page.getByRole("button", { name: "More actions for Rounak Pramanik" }).click();
  await page.getByRole("menuitem", { name: "Delete" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Delete" }).click();

  await page.getByRole("button", { name: "Save draft" }).click();
  await expect(page.getByText("Draft saved. The live site is unchanged.").first()).toBeVisible();
  expect(await readFirestoreDoc("team/ada-lovelace")).toBeNull();

  await publish(page, "Team");
  expect(await readFirestoreDoc("team/ada-lovelace")).toMatchObject({
    name: "Ada Lovelace",
    role: "organizer",
    headline: "Analyst @Engines",
    photo: { url: "https://ik.imagekit.io/gdgsiliguri1/teams/ada.png", alt: "Ada Lovelace" },
    active: true,
  });
  expect(await readFirestoreDoc("team/rounak-pramanik")).toBeNull();
  expect(((await readFirestoreDoc("team/debajyoti-sarkar"))?.links as Json).x).toBe("https://Twitter.com/debuisalive");

  const live = (await readRtdb("teams/data")) as Json[];
  expect(live).toHaveLength(19);
  expect(live.slice(0, 4).map((member) => member.name)).toEqual(["Sourav Das", "Debajit Mallick", "Avirup Basu", "Ada Lovelace"]);
  expect(live[0].description).toBe("Engineering Manager @AppyPies");
  const home = (await readFirestoreDoc("bundles/home")) as { team: Json[] };
  expect(home.team.map((member) => member.id)).toContain("ada-lovelace");
  await expect(page.getByText("version 2")).toBeVisible();
});

test("community faq: a new question needs both fields and publishes", async ({ page }) => {
  await openEditor(page, "/community/faq");
  await page.getByRole("button", { name: "Add question" }).click();
  const dialog = page.getByRole("dialog", { name: "Add question" });
  await dialog.getByRole("button", { name: "Add", exact: true }).click();
  await expect(dialog.getByText("Question is required")).toBeVisible();
  await dialog.getByLabel("Question").fill("Is there parking at the venue?");
  await dialog.getByLabel("Answer").fill("Yes, free parking is available.");
  await dialog.getByRole("button", { name: "Add", exact: true }).click();
  await publish(page, "Community FAQ");
  await expect(page.getByRole("region", { name: "Unpublished changes" })).toBeHidden();
  const live = (await readRtdb("home/gdgFAQs/data")) as Json[];
  expect(live.at(-1)).toEqual({ question: "Is there parking at the venue?", answer: "Yes, free parking is available." });
  const home = (await readFirestoreDoc("bundles/home")) as { faqs: Json[] };
  expect(home.faqs.at(-1)).toMatchObject({ question: "Is there parking at the venue?" });

  await page.getByRole("button", { name: "More actions for Is there parking at the venue?" }).click();
  await page.getByRole("menuitem", { name: "Delete" }).click();
  await expect(page.getByRole("alertdialog")).toContainText("Delete Is there parking at the venue?");
  await expect(page.getByRole("alertdialog")).not.toContainText("??");
  await page.getByRole("alertdialog").getByRole("button", { name: "Cancel" }).click();
});

test("sponsors: move a 2025 sponsor to another tier, then hide them", async ({ page }) => {
  await openEditor(page, "/devfest/2025/sponsors");
  await page.getByRole("tab", { name: /Gold/ }).click();
  await page.getByRole("button", { name: "More actions for Rise in" }).click();
  await page.getByRole("menuitem", { name: "Move to Silver" }).click();
  await expect(page.getByRole("tab", { name: "Silver (1)" })).toBeVisible();
  await publish(page, "2025 · Sponsors");
  const bundle = (await readFirestoreDoc("bundles/edition-2025")) as { sponsors: Json[] };
  expect(bundle.sponsors.filter((sponsor) => sponsor.tier === "silver").map((sponsor) => sponsor.name)).toEqual(["Rise in"]);
  const legacy = (await readRtdb("sponsors")) as { gold: Json[] };
  expect(legacy.gold.map((sponsor) => sponsor.sponsorName)).toContain("Rise in");

  await toggle(page, "2025 · Sponsors", false);
  await expect
    .poll(async () => ((await readFirestoreDoc("bundles/edition-2025")) as { sponsors: Json[] }).sponsors)
    .toEqual([]);
});

test("schedule: speakers and a session for 2026 reach the old app's schedule", async ({ page }) => {
  await openEditor(page, "/devfest/2026/speakers");
  for (const name of ["Ada Speaker", "Grace Speaker"]) {
    const first = name.split(" ")[0];
    await page.getByRole("button", { name: "Add speaker" }).click();
    const dialog = page.getByRole("dialog", { name: "Add speaker" });
    await dialog.getByLabel("Name").fill(name);
    await dialog.getByLabel("Headline").fill(`${first} @Engines`);
    await dialog.getByRole("textbox", { name: "Photo URL" }).fill(`https://ik.imagekit.io/gdgsiliguri1/speakers/${first}.png`);
    await dialog.getByRole("button", { name: "Add", exact: true }).click();
    await expect(dialog).toBeHidden();
  }
  await publish(page, "2026 · Speakers");

  await page.goto("/devfest/2026/schedule");
  await page.getByRole("button", { name: "Add session" }).click();
  const dialog = page.getByRole("dialog", { name: "Add session" });
  await dialog.getByLabel("Title").fill("Opening keynote");
  await dialog.getByRole("textbox", { name: "Starts" }).fill("10:00 AM");
  await dialog.getByRole("textbox", { name: "Ends" }).fill("10:45 AM");
  await expect(dialog.getByText("45 minutes")).toBeVisible();
  await dialog.getByRole("button", { name: "Ada Speaker" }).click();
  await dialog.getByRole("button", { name: "Grace Speaker" }).click();
  await dialog.getByRole("button", { name: "Add", exact: true }).click();
  await expect(dialog).toBeHidden();
  await publish(page, "2026 · Schedule");

  await toggle(page, "2026 · Schedule", true);
  await expect.poll(() => readRtdb("schedule/enabled")).toBe(true);
  const [slot] = (await readRtdb("schedule/data")) as Json[];
  expect(slot).toEqual({
    startTime: "10:00 AM",
    endTime: "10:45 AM",
    durationInMins: "45",
    timeZone: "IST",
    title: "Opening keynote",
    subTitle: "Ada Speaker, Grace Speaker",
    image: "https://ik.imagekit.io/gdgsiliguri1/speakers/Ada.png",
  });
  const bundle = (await readFirestoreDoc("bundles/edition-2026")) as { sessions: { id: string; speakers: Json[] }[] };
  expect(bundle.sessions[0]).toMatchObject({ id: "opening-keynote-1000" });
  expect(bundle.sessions[0].speakers.map((speaker) => speaker.id)).toEqual(["ada-speaker", "grace-speaker"]);
});

test("event: edit the venue and publish the event details", async ({ page }) => {
  await openEditor(page, "/devfest/2026/event");
  await page.getByRole("tab", { name: "Venue" }).click();
  await page.getByRole("main").getByLabel("Venue name").fill("Siliguri Convention Centre");
  await page.getByRole("tab", { name: "Perks and notes" }).click();
  await page.getByRole("textbox", { name: "Perk 1" }).fill("Hands-on workshops for everyone");
  await publish(page, "2026 · Event");
  expect(((await readFirestoreDoc("editions/2026"))?.venue as Json).name).toBe("Siliguri Convention Centre");
  const live = (await readRtdb("eventDetails")) as Record<string, Json>;
  expect(live.eventVenue.name).toBe("Siliguri Convention Centre");
  expect((live.perks.data as string[])[0]).toBe("Hands-on workshops for everyone");
  expect(live.eventDateTime).toBe("2026-11-14 08:00:00.000");
  expect(live.eventMode).toBe(true);
});

test("events: create the first event, publish it and turn the section on", async ({ page }) => {
  await openEditor(page, "/community/events");
  expect(await readRtdb("events")).toEqual({ enabled: false });
  await page.getByRole("button", { name: "Add event" }).click();
  const dialog = page.getByRole("dialog", { name: "Add event" });
  await dialog.getByLabel("Title").fill("Build with AI Siliguri");
  await dialog.getByLabel("Tagline").fill("Hands-on with Gemini");
  await dialog.getByRole("textbox", { name: "Date" }).first().fill("2026-12-20");
  await dialog.getByRole("textbox", { name: "Date" }).first().blur();
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
    eventDate: "2026-12-20",
    speakers: [{ name: "Debajit Mallick", imageUrl: "", description: "" }],
  });

  await toggle(page, "Events", true);
  await expect.poll(() => readRtdb("events/enabled")).toBe(true);
});

test("editions: a new edition stays off RTDB until it becomes active", async ({ page }) => {
  await signInAs(page, TEST_USERS.owner, "/devfest");
  await page.getByRole("button", { name: "New edition…" }).click();
  const dialog = page.getByRole("dialog", { name: "New DevFest edition" });
  await dialog.getByLabel("Year").fill("2027");
  await dialog.getByRole("textbox", { name: "Date" }).fill("2027-11-13");
  await dialog.getByRole("textbox", { name: "Date" }).blur();
  await dialog.getByRole("button", { name: "Create" }).click();
  await expect(page).toHaveURL("/devfest/2027/event");
  expect(await readFirestoreDoc("editions/2027")).toBeNull();

  await page.getByRole("main").getByLabel("Theme").fill("Build for Bharat");
  await publish(page, "2027 · Event");
  expect(await readFirestoreDoc("bundles/edition-2027")).toMatchObject({ edition: { year: 2027, theme: "Build for Bharat" } });
  expect(await readRtdb("eventDetails/eventDateTime")).toBe("2026-11-14 08:00:00.000");

  async function makeActive(title: string) {
    await page.getByRole("combobox", { name: "Active DevFest" }).click();
    await page.getByRole("option", { name: title }).click();
    await page.getByRole("alertdialog").getByRole("button", { name: "Switch" }).click();
    await publish(page, "Site");
  }

  await page.goto("/settings/site");
  await makeActive("DevFest Siliguri 2027");
  await expect.poll(() => readRtdb("eventDetails/eventDateTime")).toBe("2027-11-13 08:00:00.000");
  expect(await readRtdb("schedule")).toEqual({ enabled: false });

  await makeActive("DevFest Siliguri 2026");
  await expect.poll(() => readRtdb("eventDetails/eventDateTime")).toBe("2026-11-14 08:00:00.000");
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

test("a shown section cannot be emptied until it is turned off", async ({ page }) => {
  await openEditor(page, "/devfest/2026/faq");
  const count = await rows(page).getByRole("listitem").count();
  for (let index = 0; index < count; index += 1) {
    await page.getByRole("button", { name: /^More actions for/ }).first().click();
    await page.getByRole("menuitem", { name: "Delete" }).click();
    await page.getByRole("alertdialog").getByRole("button", { name: "Delete" }).click();
  }
  await page.getByRole("button", { name: "Publish", exact: true }).click();
  await expect(page.getByText("Turn it off before removing the last item.", { exact: false }).first()).toBeVisible();

  await toggle(page, "2026 · DevFest FAQ", false);
  await publish(page, "2026 · DevFest FAQ");
  expect(await readRtdb("FAQs")).toEqual({ enabled: false });
});

test("event details: loading an older version shows it in the form", async ({ page }) => {
  await openEditor(page, "/devfest/2026/event");
  const theme = page.getByRole("main").getByLabel("Theme");
  const before = await theme.inputValue();
  await theme.fill("Restore check");
  await publish(page, "2026 · Event");
  await page.reload();
  await expect(theme).toHaveValue("Restore check");

  await page.getByRole("button", { name: "History" }).click();
  await page.getByRole("listitem").filter({ hasText: "Version 1" }).getByRole("button", { name: "Load into draft" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Load" }).click();
  await expect(page.getByText("Version 1 loaded into the draft.", { exact: false }).first()).toBeVisible();

  await expect(theme).toHaveValue(before);
  await publish(page, "2026 · Event");
  expect(((await readFirestoreDoc("editions/2026")) as Json).theme ?? "").toBe(before);
});
