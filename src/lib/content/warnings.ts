import { durationInMins, time12ToMinutes } from "@/lib/datetime";
import { isHttpsUrl } from "@/lib/url";

import type { ContentIssue } from "./errors";
import type { Partner, ScheduleItem, SectionValues, Speaker } from "./schemas";
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
      if (close) {
        warnings.push({ path: path("subTitle"), message: `Did you mean the speaker "${close}"?` });
      }
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

export function sectionWarnings<K extends SectionKey>(
  key: K,
  value: SectionValues[K],
  context: WarningContext = {},
): ContentIssue[] {
  const warnings = linkWarnings(value);
  if (key === "schedule") {
    warnings.push(...scheduleWarnings((value as SectionValues["schedule"]).data, context.speakers));
  }
  if (key === "communityPartners") {
    warnings.push(...partnerWarnings((value as SectionValues["communityPartners"]).data));
  }
  return warnings;
}
