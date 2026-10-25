import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { ContentError } from "./errors";
import { normalizeForSave } from "./normalize";
import { valueAtPath } from "./paths";
import { toRtdbValue } from "./rtdb-value";
import {
  isEnabled,
  itemCount,
  parseSection,
  SECTION_KEYS,
  SECTIONS,
  validateForPublish,
  type SectionKey,
} from "./sections";
import { sectionWarnings } from "./warnings";

const seed = JSON.parse(readFileSync(new URL("../../../seed/rtdb-export.json", import.meta.url), "utf8"));
const seededKeys = SECTION_KEYS.filter((key) => valueAtPath(seed, SECTIONS[key].rtdbPath) != null);

function seedValue(key: SectionKey) {
  return structuredClone(valueAtPath(seed, SECTIONS[key].rtdbPath));
}

function messagesAt(issues: { path: PropertyKey[]; message: string }[], path: PropertyKey[]) {
  return issues
    .filter((issue) => JSON.stringify(issue.path) === JSON.stringify(path))
    .map((issue) => issue.message);
}

describe("section map", () => {
  it("maps every section key to the RTDB path the site reads", () => {
    expect(Object.fromEntries(SECTION_KEYS.map((key) => [key, SECTIONS[key].rtdbPath]))).toEqual({
      eventDetails: "eventDetails",
      schedule: "schedule",
      speakers: "speakers",
      sponsors: "sponsors",
      communityPartners: "communityPartners",
      devfestFaqs: "FAQs",
      gdgFaqs: "home/gdgFAQs",
      teams: "teams",
      feedbacks: "feedbacks",
      events: "events",
    });
  });

  it("has seed data for every section except events", () => {
    expect(SECTION_KEYS.filter((key) => !seededKeys.includes(key))).toEqual(["events"]);
  });
});

describe("round trip through the admin", () => {
  it.each(seededKeys)("%s: parse then serialize equals the production snapshot", (key) => {
    const original = seedValue(key);
    const parsed = parseSection(key, original);
    const firestoreCopy = structuredClone(parsed);
    expect(toRtdbValue(key, firestoreCopy)).toStrictEqual(original);
  });

  it("keeps fields the admin does not know about", () => {
    const value = seedValue("teams") as { data: Record<string, unknown>[] };
    value.data[0].pronouns = "he/him";
    (value as Record<string, unknown>).layout = { columns: 3 };
    expect(toRtdbValue("teams", parseSection("teams", value))).toStrictEqual(value);
  });

  it("keeps empty strings and string durations", () => {
    const schedule = parseSection("schedule", seedValue("schedule"));
    expect(schedule.data[0].durationInMins).toBe("120");
    expect(schedule.data[0].image).toBe("");
    expect(typeof toRtdbValue("schedule", schedule).enabled).toBe("boolean");
  });

  it("keeps eventMode and frames in event details", () => {
    const details = toRtdbValue("eventDetails", parseSection("eventDetails", seedValue("eventDetails")));
    expect(details.eventMode).toBe(true);
    expect(details.frames).toEqual((seedValue("eventDetails") as Record<string, unknown>).frames);
  });
});

describe("empty arrays", () => {
  it("refuses to publish an enabled section with no items", () => {
    expect(() => toRtdbValue("feedbacks", { enabled: true, data: [] })).toThrow(ContentError);
  });

  it("writes a disabled empty section without a data key", () => {
    expect(toRtdbValue("events", { enabled: false, data: [] })).toStrictEqual({ enabled: false });
  });

  it("omits empty sponsor tiers", () => {
    const value = { enabled: true, platinum: [{ sponsorName: "A", icon: "https://a.dev/a.png", socialMediaLink: "" }], gold: [], silver: [] };
    expect(toRtdbValue("sponsors", value)).toStrictEqual({ enabled: true, platinum: value.platinum });
  });

  it("refuses enabled sponsors with every tier empty", () => {
    expect(() => toRtdbValue("sponsors", { enabled: true, platinum: [], gold: [], silver: [] })).toThrow(
      /no items/,
    );
  });

  it("guards the perks and points-to-note lists inside event details", () => {
    const details = parseSection("eventDetails", seedValue("eventDetails"));
    expect(() => toRtdbValue("eventDetails", { ...details, perks: { enabled: true, data: [] } })).toThrow(
      /Perks/,
    );
    const disabled = toRtdbValue("eventDetails", { ...details, perks: { enabled: false, data: [] } });
    expect(disabled.perks).toStrictEqual({ enabled: false });
  });

  it("never writes undefined values", () => {
    expect(toRtdbValue("devfestFaqs", { enabled: true, data: [{ question: "Q", answer: "A", extra: undefined }] })).toStrictEqual({
      enabled: true,
      data: [{ question: "Q", answer: "A" }],
    });
  });
});

describe("publish validation", () => {
  it.each(seededKeys.filter((key) => key !== "teams"))("%s: production data is publishable", (key) => {
    const result = validateForPublish(key, parseSection(key, seedValue(key)));
    expect(result.success ? [] : result.error.issues).toEqual([]);
  });

  it("flags the schemeless Twitter URL in teams", () => {
    const result = validateForPublish("teams", parseSection("teams", seedValue("teams")));
    expect(result.success).toBe(false);
    const paths = result.error!.issues.map((issue) => issue.path.join("."));
    expect(paths).toContain("data.5.twitterURL");
  });

  it("requires names, titles, questions and logos", () => {
    const faq = validateForPublish("devfestFaqs", { enabled: true, data: [{ question: " ", answer: "" }] });
    expect(faq.error!.issues.map((issue) => issue.message)).toEqual([
      "Question is required",
      "Answer is required",
    ]);
    const sponsor = validateForPublish("sponsors", {
      enabled: true,
      platinum: [{ sponsorName: "", icon: "", socialMediaLink: "" }],
    });
    expect(sponsor.error!.issues.map((issue) => issue.message)).toEqual([
      "Sponsor name is required",
      "Logo is required",
    ]);
  });

  it("checks time and datetime formats", () => {
    const schedule = parseSection("schedule", seedValue("schedule"));
    schedule.data[0].startTime = "8:00";
    expect(validateForPublish("schedule", schedule).error!.issues[0].path).toEqual([
      "data",
      0,
      "startTime",
    ]);
    const details = parseSection("eventDetails", seedValue("eventDetails"));
    details.eventDateTime = "2025-11-16T08:00:00Z";
    expect(validateForPublish("eventDetails", details).success).toBe(false);
  });

  it("rejects duplicate event ids", () => {
    const event = { id: "io-extended", name: "I/O Extended", tagline: "", description: "", thumbnail: "", coverImg: "", registrationDate: "", eventDate: "2026-07-12", registrationLink: "", speakers: [] };
    const result = validateForPublish("events", { enabled: true, data: [event, { ...event }] });
    expect(result.error!.issues.map((issue) => issue.path.join("."))).toEqual(["data.1.id"]);
  });
});

describe("known production data issues are surfaced", () => {
  const schedule = parseSection("schedule", seedValue("schedule"));
  const speakers = parseSection("speakers", seedValue("speakers")).data;
  const scheduleIssues = sectionWarnings("schedule", schedule, { speakers });

  it("flags the 12:10 AM panel discussion", () => {
    expect(messagesAt(scheduleIssues, ["data", 4, "startTime"])).toEqual([
      "Starts earlier than the slot above it. Check AM/PM or the order.",
    ]);
  });

  it("flags the speaker-name typo", () => {
    expect(messagesAt(scheduleIssues, ["data", 9, "subTitle"])).toEqual([
      'Did you mean the speaker "Nitin Prakash"?',
    ]);
  });

  it("flags the wrong duration on the second panel", () => {
    expect(messagesAt(scheduleIssues, ["data", 10, "durationInMins"])).toEqual([
      "Duration says 15 min but the slot is 30 min.",
    ]);
  });

  it("flags the swapped partner links", () => {
    const partners = parseSection("communityPartners", seedValue("communityPartners"));
    const issues = sectionWarnings("communityPartners", partners);
    expect(issues.map((issue) => issue.path.join("."))).toEqual([
      "data.0.socialMediaLink",
      "data.1.socialMediaLink",
    ]);
  });

  it("flags a ticket link for a different year's event", () => {
    const details = parseSection("eventDetails", seedValue("eventDetails"));
    expect(messagesAt(sectionWarnings("eventDetails", details), ["eventTicketURL"])).toEqual([]);
    const nextYear = { ...details, eventDateTime: "2026-11-14 08:00:00.000" };
    expect(messagesAt(sectionWarnings("eventDetails", nextYear), ["eventTicketURL"])).toEqual([
      "This link points to the 2025 event page, but DevFest is in 2026.",
    ]);
  });

  it("flags the schemeless Twitter URL and the trailing spaces in teams", () => {
    const teams = parseSection("teams", seedValue("teams"));
    const paths = sectionWarnings("teams", teams).map((issue) => issue.path.join("."));
    expect(paths).toEqual(["data.5.twitterURL", "data.9.linkedInURL", "data.9.twitterURL"]);
  });
});

describe("normalizeForSave", () => {
  it("trims links but leaves other text alone", () => {
    expect(
      normalizeForSave({ data: [{ name: " Hrishab ", twitterURL: "https://x.com/h ", icon: " https://a.dev/i.png" }] }),
    ).toEqual({ data: [{ name: " Hrishab ", twitterURL: "https://x.com/h", icon: "https://a.dev/i.png" }] });
  });
});

describe("dashboard helpers", () => {
  it("counts items and reads enabled state", () => {
    expect(itemCount("teams", seedValue("teams"))).toBe(21);
    expect(itemCount("sponsors", seedValue("sponsors"))).toBe(4);
    expect(itemCount("eventDetails", seedValue("eventDetails"))).toBeNull();
    expect(isEnabled("speakers", seedValue("speakers"))).toBe(false);
    expect(isEnabled("eventDetails", seedValue("eventDetails"))).toBeNull();
  });
});
