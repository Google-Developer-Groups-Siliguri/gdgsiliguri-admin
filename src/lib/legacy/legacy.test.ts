import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { valueAtPath } from "@/lib/content/paths";
import { strict, type Edition } from "@/lib/schema/v2";
import { LEGACY_NODES, type LegacyNode } from "@/lib/sections/registry";

import { normalizeLegacy } from "./compare";
import { DEFAULT_FROM_RTDB_OPTIONS, editionFromLabel, fromRtdb, sessionType, type V2Data } from "./from-rtdb";
import { strictSchemas } from "./schemas";
import { buildLegacyRoot, type LegacySources } from "./to-rtdb";

const seed = JSON.parse(readFileSync(new URL("../../../seed/rtdb-export.json", import.meta.url), "utf8"));

const LEGACY_SCHEMA: Partial<Record<LegacyNode, keyof typeof strictSchemas.sections>> = {
  eventDetails: "eventDetails",
  schedule: "schedule",
  speakers: "speakers",
  sponsors: "sponsors",
  communityPartners: "communityPartners",
  FAQs: "devfestFaqs",
  "home/gdgFAQs": "gdgFaqs",
  teams: "teams",
  feedbacks: "feedbacks",
  events: "events",
};

function sourcesFor(data: V2Data, year: number): LegacySources {
  return {
    site: data.site,
    active: data.editions[year],
    editions: Object.values(data.editions).map((content) => content.doc),
    team: data.team,
    testimonials: data.testimonials,
    faqs: data.faqs,
    events: data.events,
  };
}

const presentNodes = LEGACY_NODES.filter((path) => valueAtPath(seed, path) != null);

describe("round trip in single-edition mode", () => {
  const data = fromRtdb(seed, { year: 2025, carryOver: "all" });
  const root = buildLegacyRoot(sourcesFor(data, 2025), LEGACY_NODES);

  it.each(presentNodes)("/%s equals the cleaned seed", (path) => {
    const social = path === "eventDetails" ? valueAtPath(seed, "eventDetails/socialMediaLinks") : undefined;
    const expected = normalizeLegacy(valueAtPath(seed, path)) as Record<string, unknown>;
    if (social) expected.socialMediaLinks = social;
    expect(root[path]).toStrictEqual(expected);
  });

  it.each(presentNodes.filter((path) => LEGACY_SCHEMA[path]))("/%s passes the legacy strict schema", (path) => {
    const result = strictSchemas.sections[LEGACY_SCHEMA[path]!].safeParse(root[path]);
    expect(result.success ? [] : result.error.issues).toEqual([]);
  });

  it("writes no empty arrays anywhere", () => {
    expect(JSON.stringify(root)).not.toMatch(/\[\]/);
  });
});

describe("backfill (2025 content, 2026 active)", () => {
  const data = fromRtdb(seed, {
    ...DEFAULT_FROM_RTDB_OPTIONS,
    appSettings: {
      latestBuild: 4000,
      storeUrls: {
        android: "https://play.google.com/store/apps/details?id=com.amarjitmallick.gdg_siliguri",
        ios: "https://apps.apple.com/app/id0000000000",
      },
    },
  });
  const [past, active] = [data.editions[2025], data.editions[2026]];

  it("puts the lineup in 2025 on the 2025 date and leaves 2026 empty", () => {
    expect(past.sessions).toHaveLength(12);
    expect(past.sessions[0]).toMatchObject({
      id: "registration-0800",
      type: "registration",
      startAt: "2025-11-16T02:30:00.000Z",
      endAt: "2025-11-16T04:30:00.000Z",
      speakerIds: [],
    });
    expect(past.doc).toMatchObject({ startAt: "2025-11-16T02:30:00.000Z", endAt: "2025-11-16T12:00:00.000Z" });
    expect(active.sessions).toEqual([]);
    expect(active.speakers).toEqual([]);
    expect(active.sponsors).toEqual([]);
  });

  it("dates 2026 on 14 Nov with a 17:30 placeholder end and no registration", () => {
    expect(active.doc).toMatchObject({
      year: 2026,
      startAt: "2026-11-14T02:30:00.000Z",
      endAt: "2026-11-14T12:00:00.000Z",
      registration: {},
      venue: { name: "ITC Fortune Select Siliguri" },
    });
    expect(active.doc.sections).toEqual({
      schedule: false,
      speakers: false,
      sponsors: false,
      partners: true,
      faqs: true,
      perks: true,
      notes: true,
      registration: false,
    });
    expect(active.doc.theme).toBeUndefined();
    expect(data.site.activeEdition).toBe(2026);
  });

  it("carries partners and FAQs into 2026 with the same ids", () => {
    expect(active.partners.map((partner) => partner.id)).toEqual(past.partners.map((partner) => partner.id));
    expect(active.faqs).toEqual(past.faqs);
    expect(active.partners[0]).toMatchObject({
      id: "gdg-on-campus-jalpaiguri-govt-engineering-college",
      logo: { alt: "GDG on Campus Jalpaiguri Govt. Engineering College" },
    });
  });

  it("links every session speaker, including the corrected name", () => {
    expect(data.report.unmatchedSpeakers).toEqual([]);
    const nitin = past.sessions.find((session) => session.title.startsWith("AI in Android"));
    expect(nitin?.speakerIds).toEqual(["nitin-prakash"]);
    expect(nitin?.trackId).toBe("app");
    expect(data.report.amPmAnomalies).toEqual([]);
  });

  it("gives the two panels distinct ids and types sessions from their titles", () => {
    const panels = past.sessions.filter((session) => session.type === "panel").map((session) => session.id);
    expect(panels).toEqual(["panel-discussion-1210", "panel-discussion-1630"]);
    expect(past.sessions.find((session) => session.title === "End Note")?.type).toBe("keynote");
    expect(past.sessions.find((session) => session.title === "Lunch Break")?.type).toBe("break");
  });

  it("parses the speaker company from the headline", () => {
    expect(past.speakers.find((speaker) => speaker.id === "rishabh-gupta")?.company).toBe(
      "Mercedes-Benz Research and Development India",
    );
  });

  it("strips the updatedAt cache-buster from every URL", () => {
    expect(JSON.stringify({ ...data, report: null })).not.toMatch(/\?updatedAt=/);
    expect(data.report.cleanedUrls.length).toBeGreaterThan(0);
  });

  it.each([
    ["siteConfig", () => data.site],
    ["siteApp", () => data.siteApp],
    ["edition", () => past.doc],
    ["edition", () => active.doc],
  ] as const)("%s parses in strict mode", (schema, value) => {
    const result = strict[schema].safeParse(value());
    expect(result.success ? [] : result.error.issues).toEqual([]);
  });

  it.each([
    ["sessions", () => past.sessions],
    ["speakers", () => past.speakers],
    ["sponsors", () => past.sponsors],
    ["partners", () => active.partners],
    ["faqs", () => active.faqs],
    ["team", () => data.team],
    ["events", () => data.events],
    ["testimonials", () => data.testimonials],
    ["faqs", () => data.faqs],
  ] as const)("%s parse in strict mode", (schema, items) => {
    const result = strict[schema].safeParse({ items: items() });
    expect(result.success ? [] : result.error.issues).toEqual([]);
  });

  it("writes the RTDB shape the old app expects for 2026", () => {
    const root = buildLegacyRoot(sourcesFor(data, 2026), LEGACY_NODES);
    expect(root.schedule).toEqual({ enabled: false });
    expect(root.speakers).toEqual({ enabled: false });
    expect(root.sponsors).toEqual({ enabled: false });
    const details = root.eventDetails as Record<string, unknown>;
    expect(details.eventDateTime).toBe("2026-11-14 08:00:00.000");
    expect(details.registrationExpiryDateTime).toBe("2026-11-14 08:00:00.000");
    expect(details.eventTicketURL).toBe("");
    expect(details.eventMode).toBe(true);
    expect(root["home/pastDevfests"]).toEqual({ enabled: false, data: [{ year: "2025", highlight: "" }] });
    expect((root.communityPartners as { data: unknown[] }).data).toHaveLength(11);
  });

  it("omits eventMode when it is auto", () => {
    const root = buildLegacyRoot({ ...sourcesFor(data, 2026), site: { ...data.site, eventMode: "auto" } }, [
      "eventDetails",
    ]);
    expect(root.eventDetails).not.toHaveProperty("eventMode");
  });

  it("writes only platinum, gold and silver sponsors to RTDB", () => {
    const doc: Edition = { ...past.doc, sections: { ...past.doc.sections, sponsors: true } };
    const extra = { ...past.sponsors[0], id: "media-co", tier: "media" as const };
    const root = buildLegacyRoot(
      { ...sourcesFor(data, 2025), active: { ...past, doc, sponsors: [...past.sponsors, extra] } },
      ["sponsors"],
    );
    expect(Object.keys(root.sponsors)).toEqual(["enabled", "platinum", "gold"]);
  });
});

describe("helpers", () => {
  it.each([
    ["@Devfest'22", 2022],
    ["@Devfest'19", 2019],
    ["DevFest 2024", 2024],
    ["Meetup", undefined],
  ])("edition from %s", (label, year) => {
    expect(editionFromLabel(label)).toBe(year);
  });

  it.each([
    ["Registration", "registration"],
    ["Lunch Break", "break"],
    ["Tea break", "break"],
    ["Panel Discussion", "panel"],
    ["Welcome note", "keynote"],
    ["Android on Automotive - AAOS", "talk"],
  ])("%s is a %s", (title, type) => {
    expect(sessionType(title)).toBe(type);
  });
});
