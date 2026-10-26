import type { Edition, Partner, Session, Speaker, Sponsor } from "@/lib/schema/v2";
import { parseSectionId } from "@/lib/sections/registry";

import type { ContentIssue } from "./errors";

type Doc = Record<string, unknown>;
type Path = (string | number)[];

const TEST_TEXT = /\b(e2e|test)\b/i;
const LONG_GAP_MS = 30 * 60_000;
const EDGE_MS = 2 * 3600_000;

export type WarningContext = { edition?: Edition; speakers?: Speaker[]; sessions?: Session[] };

function stringPaths(value: unknown, path: Path, test: (text: string) => boolean): Path[] {
  if (typeof value === "string") return test(value) ? [path] : [];
  if (Array.isArray(value)) return value.flatMap((entry, index) => stringPaths(entry, [...path, index], test));
  if (value && typeof value === "object") {
    return Object.entries(value).flatMap(([key, entry]) => (key === "id" ? [] : stringPaths(entry, [...path, key], test)));
  }
  return [];
}

function owningItem(path: Path): Path {
  const index = path.findIndex((part) => typeof part === "number");
  return index < 0 ? path : path.slice(0, index + 1);
}

export function testContentWarnings(value: unknown): ContentIssue[] {
  const items = new Map<string, Path>();
  for (const path of stringPaths(value, [], (text) => TEST_TEXT.test(text))) {
    const item = owningItem(path);
    items.set(item.join("."), item);
  }
  return [...items.values()].map((path) => ({ path, message: "Looks like test content. Remove it before publishing." }));
}

export function duplicateUrlWarnings(items: { name: string; url?: string }[]): ContentIssue[] {
  const byUrl = new Map<string, number[]>();
  items.forEach((item, index) => {
    const url = item.url?.trim().replace(/\/+$/, "").toLowerCase();
    if (url) byUrl.set(url, [...(byUrl.get(url) ?? []), index]);
  });
  return [...byUrl.values()]
    .filter((indexes) => indexes.length > 1)
    .flatMap((indexes) =>
      indexes.map((index) => ({
        path: ["items", index, "url"],
        message: `Same link as ${indexes
          .filter((other) => other !== index)
          .map((other) => `"${items[other].name}"`)
          .join(", ")}.`,
      })),
    );
}

const time = (value: string) => Date.parse(value);

export function sessionWarnings(sessions: Session[], { edition, speakers = [] }: WarningContext): ContentIssue[] {
  const warnings: ContentIssue[] = [];
  const people = new Map(speakers.map((speaker) => [speaker.id, speaker.name]));
  const timed = sessions
    .map((session, index) => ({ session, index }))
    .filter(({ session }) => !Number.isNaN(time(session.startAt)) && !Number.isNaN(time(session.endAt)))
    .sort((a, b) => time(a.session.startAt) - time(b.session.startAt) || a.session.order - b.session.order);

  timed.forEach(({ session, index }, position) => {
    const start = time(session.startAt);
    const end = time(session.endAt);
    if (edition && (start < time(edition.startAt) - EDGE_MS || end > time(edition.endAt) + EDGE_MS)) {
      warnings.push({ path: ["items", index, "startAt"], message: "Outside the event hours." });
    }
    const previous = timed[position - 1]?.session;
    if (previous && start - time(previous.endAt) > LONG_GAP_MS) {
      const minutes = Math.round((start - time(previous.endAt)) / 60_000);
      warnings.push({ path: ["items", index, "startAt"], message: `${minutes} minutes after "${previous.title}" ends.` });
    }
    for (const other of timed.slice(0, position)) {
      if (time(other.session.endAt) <= start || (other.session.room ?? "") !== (session.room ?? "")) continue;
      warnings.push({
        path: ["items", index, "startAt"],
        message: `Overlaps "${other.session.title}"${session.room ? ` in ${session.room}` : ""}.`,
      });
      for (const id of session.speakerIds.filter((speakerId) => other.session.speakerIds.includes(speakerId))) {
        warnings.push({
          path: ["items", index, "speakerIds"],
          message: `${people.get(id) ?? id} is also speaking in "${other.session.title}" at the same time.`,
        });
      }
    }
    session.speakerIds.forEach((id, slot) => {
      if (speakers.length && !people.has(id)) {
        warnings.push({ path: ["items", index, "speakerIds", slot], message: `"${id}" is not in the speakers list.` });
      }
    });
  });
  return warnings;
}

export function speakerWarnings(speakers: Speaker[], { sessions }: WarningContext): ContentIssue[] {
  if (!sessions) return [];
  const speaking = new Set(sessions.flatMap((session) => session.speakerIds));
  return speakers.flatMap((speaker, index) =>
    speaker.id && !speaking.has(speaker.id)
      ? [{ path: ["items", index], message: `${speaker.name || "This speaker"} has no session yet.` }]
      : [],
  );
}

export function editionWarnings(edition: Edition): ContentIssue[] {
  const url = edition.registration?.url ?? "";
  const years: string[] = url.match(/(?<!\d)20\d{2}(?!\d)/g) ?? [];
  if (years.length === 0 || years.includes(String(edition.year))) return [];
  return [
    {
      path: ["registration", "url"],
      message: `This link points to the ${years.at(-1)} event page, but this is DevFest ${edition.year}.`,
    },
  ];
}

export function sectionWarnings(sectionId: string, value: Doc, context: WarningContext = {}): ContentIssue[] {
  const warnings = testContentWarnings(value);
  const items = (value.items ?? []) as Doc[];
  const parsed = parseSectionId(sectionId);
  if (parsed.type === "edition" && !parsed.collection) warnings.push(...editionWarnings(value as Edition));
  if (parsed.type === "edition" && parsed.collection === "sessions") {
    warnings.push(...sessionWarnings(items as Session[], context));
  }
  if (parsed.type === "edition" && parsed.collection === "speakers") {
    warnings.push(...speakerWarnings(items as Speaker[], context));
  }
  if (parsed.type === "edition" && (parsed.collection === "partners" || parsed.collection === "sponsors")) {
    warnings.push(...duplicateUrlWarnings(items as (Partner | Sponsor)[]));
  }
  return warnings;
}
