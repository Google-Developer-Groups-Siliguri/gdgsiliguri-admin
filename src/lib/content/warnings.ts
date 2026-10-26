import { durationInMins, time12ToMinutes } from "@/lib/datetime";
import { isHttpsUrl } from "@/lib/url";

import type { ContentIssue } from "./errors";
import type { EventDetails, Partner, ScheduleItem, SectionValues, Speaker } from "@/lib/legacy/schemas";
import { SPONSOR_TIERS } from "@/lib/legacy/schemas";
import type { SectionKey } from "./sections";

export type WarningContext = { speakers?: Speaker[] };

function levenshtein(a: string, b: string): number {
  const row = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let i = 1; i <= a.length; i += 1) {
    let previous = row[0];
    row[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const current = row[j];
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, previous + (a[i - 1] === b[j - 1] ? 0 : 1));
      previous = current;
    }
  }
  return row[b.length];
}

export function scheduleWarnings(items: ScheduleItem[], speakers: Speaker[] = []): ContentIssue[] {
  const warnings: ContentIssue[] = [];
  const speakerNames = speakers.map((speaker) => speaker.name.trim()).filter(Boolean);

  items.forEach((item, index) => {
    const start = time12ToMinutes(item.startTime);
    const end = time12ToMinutes(item.endTime);
    const path = (field: string) => ["data", index, field];
    if (start !== null && end !== null) {
      if (end <= start) {
        warnings.push({ path: path("endTime"), message: "Ends before it starts. Check AM/PM." });
      } else if (durationInMins(item.startTime, item.endTime) !== item.durationInMins) {
        warnings.push({
          path: path("durationInMins"),
          message: `Duration says ${item.durationInMins} min but the slot is ${end - start} min.`,
        });
      }
      const previous = items[index - 1];
      const previousStart = previous ? time12ToMinutes(previous.startTime) : null;
      const previousEnd = previous ? time12ToMinutes(previous.endTime) : null;
      if (previousStart !== null && start < previousStart) {
        warnings.push({
          path: path("startTime"),
          message: "Starts earlier than the slot above it. Check AM/PM or the order.",
        });
      } else if (previousEnd !== null && start < previousEnd) {
        warnings.push({ path: path("startTime"), message: "Overlaps the slot above it." });
      }
    }
    const subTitle = item.subTitle.trim();
    if (subTitle && speakerNames.length && !speakerNames.includes(subTitle)) {
      const close = speakerNames.find(
        (name) => levenshtein(name.toLowerCase(), subTitle.toLowerCase()) <= 2,
      );
      warnings.push({
        path: path("subTitle"),
        message: close ? `Did you mean the speaker "${close}"?` : `"${subTitle}" matches no speaker.`,
      });
    }
  });
  return warnings;
}

const GENERIC_WORDS = new Set([
  "gdg", "google", "developer", "developers", "group", "groups", "campus", "community", "club",
  "the", "and", "of", "on", "for", "india", "https", "www", "com", "dev", "org",
]);

function tokens(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((token) => token.length >= 4 && !GENERIC_WORDS.has(token)),
  );
}

function overlap(name: string, link: string): number {
  const linkText = link.toLowerCase();
  return [...tokens(name)].filter((token) => linkText.includes(token)).length;
}

export function partnerWarnings(partners: Partner[]): ContentIssue[] {
  const warnings: ContentIssue[] = [];
  partners.forEach((partner, index) => {
    const own = overlap(partner.communityName, partner.socialMediaLink);
    partners.forEach((other, otherIndex) => {
      if (otherIndex <= index) return;
      const crossed =
        overlap(partner.communityName, other.socialMediaLink) > own &&
        overlap(other.communityName, partner.socialMediaLink) >
          overlap(other.communityName, other.socialMediaLink);
      if (crossed) {
        warnings.push({
          path: ["data", index, "socialMediaLink"],
          message: `Link looks like it belongs to "${other.communityName}". Are the two links swapped?`,
        });
        warnings.push({
          path: ["data", otherIndex, "socialMediaLink"],
          message: `Link looks like it belongs to "${partner.communityName}". Are the two links swapped?`,
        });
      }
    });
  });
  return warnings;
}

const TEST_TEXT = /\b(e2e|test)\b/i;

function testTextPaths(value: unknown, path: (string | number)[]): (string | number)[][] {
  if (typeof value === "string") return TEST_TEXT.test(value) ? [path] : [];
  if (Array.isArray(value)) return value.flatMap((entry, index) => testTextPaths(entry, [...path, index]));
  if (value && typeof value === "object") {
    return Object.entries(value).flatMap(([field, entry]) => testTextPaths(entry, [...path, field]));
  }
  return [];
}

function owningItem(path: (string | number)[]): (string | number)[] {
  const index = path.findIndex((part) => typeof part === "number");
  return index < 0 ? path : path.slice(0, index + 1);
}

export function testTextWarnings(value: unknown): ContentIssue[] {
  const items = new Map<string, (string | number)[]>();
  for (const path of testTextPaths(value, [])) {
    const item = owningItem(path);
    items.set(item.join("."), item);
  }
  return [...items.values()].map((path) => ({
    path,
    message: "Looks like test content. Remove it before publishing.",
  }));
}

type LinkedItem = { path: (string | number)[]; name: string; url: string };

export function duplicateLinkWarnings(items: LinkedItem[]): ContentIssue[] {
  const byUrl = new Map<string, LinkedItem[]>();
  for (const item of items) {
    const url = item.url.trim().replace(/\/+$/, "").toLowerCase();
    if (url) byUrl.set(url, [...(byUrl.get(url) ?? []), item]);
  }
  return [...byUrl.values()]
    .filter((group) => new Set(group.map((item) => item.name)).size > 1)
    .flatMap((group) =>
      group.map((item) => ({
        path: item.path,
        message: `Same link as ${group
          .filter((other) => other !== item)
          .map((other) => `"${other.name}"`)
          .join(", ")}.`,
      })),
    );
}

export function linkWarnings(value: unknown, path: (string | number)[] = []): ContentIssue[] {
  if (Array.isArray(value)) return value.flatMap((entry, index) => linkWarnings(entry, [...path, index]));
  if (value && typeof value === "object") {
    return Object.entries(value).flatMap(([field, entry]) => {
      if (typeof entry !== "string" || entry === "" || !/(URL|Url|Link|link|^url$)/.test(field)) {
        return linkWarnings(entry, [...path, field]);
      }
      if (entry !== entry.trim()) {
        return [{ path: [...path, field], message: "Has spaces at the start or end. They are removed when you save." }];
      }
      if (!isHttpsUrl(entry)) return [{ path: [...path, field], message: "Not a full https:// link." }];
      return [];
    });
  }
  return [];
}

export function eventDetailsWarnings(details: EventDetails): ContentIssue[] {
  const eventYear = details.eventDateTime.slice(0, 4);
  const linkYears: string[] = details.eventTicketURL.match(/(?<!\d)20\d{2}(?!\d)/g) ?? [];
  if (!/^\d{4}$/.test(eventYear) || linkYears.length === 0 || linkYears.includes(eventYear)) return [];
  return [
    {
      path: ["eventTicketURL"],
      message: `This link points to the ${linkYears[linkYears.length - 1]} event page, but DevFest is in ${eventYear}.`,
    },
  ];
}

export function sectionWarnings<K extends SectionKey>(
  key: K,
  value: SectionValues[K],
  context: WarningContext = {},
): ContentIssue[] {
  const warnings = [...linkWarnings(value), ...testTextWarnings(value)];
  if (key === "schedule") {
    warnings.push(...scheduleWarnings((value as SectionValues["schedule"]).data, context.speakers));
  }
  if (key === "eventDetails") {
    warnings.push(...eventDetailsWarnings(value as SectionValues["eventDetails"]));
  }
  if (key === "communityPartners") {
    const partners = (value as SectionValues["communityPartners"]).data;
    warnings.push(...partnerWarnings(partners));
    warnings.push(
      ...duplicateLinkWarnings(
        partners.map((partner, index) => ({
          path: ["data", index, "socialMediaLink"],
          name: partner.communityName,
          url: partner.socialMediaLink,
        })),
      ),
    );
  }
  if (key === "sponsors") {
    const sponsors = value as SectionValues["sponsors"];
    warnings.push(
      ...duplicateLinkWarnings(
        SPONSOR_TIERS.flatMap((tier) =>
          sponsors[tier].map((sponsor, index) => ({
            path: [tier, index, "socialMediaLink"],
            name: sponsor.sponsorName,
            url: sponsor.socialMediaLink,
          })),
        ),
      ),
    );
  }
  return warnings;
}
