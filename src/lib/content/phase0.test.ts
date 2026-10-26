import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { removeE2E } from "./cleanup";
import { applyKnownFixes } from "./known-fixes";
import { normalizeForSave } from "./normalize";
import { valueAtPath } from "./paths";
import { toRtdbValue } from "./rtdb-value";
import type { SectionValues } from "./schemas";
import { parseSection, SECTION_KEYS, SECTIONS, validateForPublish, type SectionKey } from "./sections";

const readSeed = (file: string) =>
  JSON.parse(readFileSync(new URL(`../../../seed/${file}`, import.meta.url), "utf8")) as Record<string, unknown>;
const uncleaned = readSeed("rtdb-export.uncleaned.json");
const cleaned = readSeed("rtdb-export.json");

function sectionsOf(root: Record<string, unknown>): Partial<SectionValues> {
  return Object.fromEntries(
    SECTION_KEYS.map((key) => [key, parseSection(key, valueAtPath(root, SECTIONS[key].rtdbPath))]),
  ) as Partial<SectionValues>;
}

function publishAll(sections: Partial<SectionValues>): Record<string, unknown> {
  return Object.fromEntries(
    (Object.entries(sections) as [SectionKey, unknown][]).map(([key, value]) => [
      SECTIONS[key].rtdbPath,
      toRtdbValue(key, parseSection(key, normalizeForSave(value))),
    ]),
  );
}

describe("E2E clean-up", () => {
  it("finds exactly the six known test rows in the production snapshot", () => {
    const { changes } = removeE2E(sectionsOf(uncleaned));
    expect(changes.map((change) => `${change.path} ${change.description}`)).toEqual([
      'eventDetails.perks.data[8] Remove "E2E test perk"',
      'eventDetails.pointsToNote.data[6] Remove "E2E test point to note"',
      'home.gdgFAQs.data[3] Remove "E2E test question: is this a test?"',
      'teams.data[18] Remove "E2E Test Member"',
      'feedbacks.data[5] Remove "E2E Reviewer"',
      'events.data[0] Remove "E2E Test Meetup"',
    ]);
  });

  it("turns off a section whose last item was test content", () => {
    const { sections } = removeE2E(sectionsOf(uncleaned));
    expect(sections.events).toEqual({ enabled: false, data: [] });
    expect(sections.feedbacks?.enabled).toBe(true);
  });
});

describe("known content fixes", () => {
  const { sections, changes } = applyKnownFixes(sectionsOf(uncleaned));

  it("fixes the AM/PM, duration and speaker name in the schedule", () => {
    expect(sections.schedule!.data[4]).toMatchObject({ startTime: "12:10 PM", endTime: "12:40 PM", durationInMins: "30" });
    expect(sections.schedule!.data[10].durationInMins).toBe("30");
    expect(sections.schedule!.data[9].subTitle).toBe("Nitin Prakash");
    expect(sections.speakers!.data.at(-1)).toMatchObject({ name: "Nitin Prakash", description: "" });
  });

  it("swaps the JGEC and AOT links", () => {
    const [jgec, aot] = sections.communityPartners!.data;
    expect(jgec.socialMediaLink).toMatch(/jalpaiguri/);
    expect(aot.socialMediaLink).toMatch(/academy-of-technology/);
  });

  it("points the FAQs at the 2026 date and venue and drops old venue questions", () => {
    const text = JSON.stringify(sections.devfestFaqs);
    expect(text).not.toMatch(/Royal Sarovar/);
    expect(text).toContain("November 14, 2026");
    expect(text).toContain("ITC Fortune Select Siliguri");
  });

  it("cleans the venue, ticket link and typos", () => {
    const details = sections.eventDetails!;
    expect(details.eventVenue.name).toBe("ITC Fortune Select Siliguri");
    expect(details.eventVenue.mapsURLweb).not.toMatch(/width=|"/);
    expect(details.eventTicketURL).toBe("");
    expect(JSON.stringify(details)).not.toMatch(/technogies|givaways|voluneers|DevFest 2025 Siliguri/);
    expect(details.eventDateTime).toBe("2026-11-14 08:00:00.000");
  });

  it("is idempotent", () => {
    expect(applyKnownFixes(sections).changes).toEqual([]);
    expect(changes.length).toBeGreaterThan(0);
  });

  it("makes every section publishable in strict mode", () => {
    for (const key of SECTION_KEYS) {
      const result = validateForPublish(key, normalizeForSave(sections[key]));
      expect(result.success ? [] : result.error.issues, key).toEqual([]);
    }
  });
});

describe("refreshed seed", () => {
  it("equals the production snapshot after the fixes and the clean-up", () => {
    const fixed = applyKnownFixes(sectionsOf(uncleaned)).sections;
    const published = publishAll(removeE2E(fixed).sections);
    for (const key of SECTION_KEYS) {
      const path = SECTIONS[key].rtdbPath;
      expect(published[path], path).toStrictEqual(valueAtPath(cleaned, path));
    }
  });
});
