import type { Edition, Session, SiteConfig, Speaker } from "@/lib/schema/v2";
import { parseSectionId, type SectionDef } from "@/lib/sections/registry";
import { toMillis } from "@/lib/time/tz";

import type { ContentIssue } from "./errors";
import type { FirestoreReader } from "./reader";

type Doc = Record<string, unknown>;

const EDGE_MS = 2 * 3600_000;

const SITE_LISTS: Record<string, string> = {
  team: "team",
  events: "events",
  testimonials: "testimonials",
  faqs: "faqs",
};
const EDITION_LISTS: Record<string, string> = {
  schedule: "sessions",
  speakers: "speakers",
  sponsors: "sponsors",
  partners: "partners",
  faqs: "faqs",
};
const EDITION_STRINGS: Record<string, "perks" | "notes"> = { perks: "perks", notes: "notes" };

function sessionIssues(edition: Edition, sessions: Session[], speakers: Speaker[]): ContentIssue[] {
  const from = toMillis(edition.startAt) - EDGE_MS;
  const to = toMillis(edition.endAt) + EDGE_MS;
  const tracks = new Set(edition.tracks.map((track) => track.id));
  const people = new Set(speakers.map((speaker) => speaker.id));
  return sessions.flatMap((session, index) => {
    const issues: ContentIssue[] = [];
    const path = (field: string) => ["items", index, field];
    if (toMillis(session.startAt) < from || toMillis(session.endAt) > to) {
      issues.push({ path: path("startAt"), message: "This session is outside the event hours" });
    }
    if (session.trackId && !tracks.has(session.trackId)) {
      issues.push({ path: path("trackId"), message: `There is no "${session.trackId}" track in this edition` });
    }
    session.speakerIds.forEach((id, position) => {
      if (!people.has(id)) {
        issues.push({
          path: ["items", index, "speakerIds", position],
          message: `"${id}" is not a published speaker. Publish the speakers first.`,
        });
      }
    });
    return issues;
  });
}

function speakerIssues(edition: Edition, speakers: Speaker[], sessions: Session[]): ContentIssue[] {
  const tracks = new Set(edition.tracks.map((track) => track.id));
  const kept = new Set(speakers.map((speaker) => speaker.id));
  const issues: ContentIssue[] = speakers.flatMap((speaker, index) =>
    speaker.trackId && !tracks.has(speaker.trackId)
      ? [{ path: ["items", index, "trackId"], message: `There is no "${speaker.trackId}" track in this edition` }]
      : [],
  );
  for (const session of sessions) {
    for (const id of session.speakerIds) {
      if (!kept.has(id)) {
        issues.push({
          path: ["items"],
          message: `"${id}" speaks in "${session.title}". Remove them from the schedule before deleting them.`,
        });
      }
    }
  }
  return issues;
}

async function editionDocIssues(read: FirestoreReader, year: number, edition: Edition): Promise<ContentIssue[]> {
  const base = `editions/${year}`;
  const [sessions, speakers] = await Promise.all([
    read.collection(`${base}/sessions`) as Promise<Session[]>,
    read.collection(`${base}/speakers`) as Promise<Speaker[]>,
  ]);
  const tracks = new Set(edition.tracks.map((track) => track.id));
  const used = new Set(
    [...sessions, ...speakers].map((item) => item.trackId).filter((id): id is string => Boolean(id)),
  );
  const issues: ContentIssue[] = [...used]
    .filter((id) => !tracks.has(id))
    .map((id) => ({ path: ["tracks"], message: `The "${id}" track is still used by sessions or speakers` }));
  for (const [key, collection] of Object.entries(EDITION_LISTS)) {
    if (!edition.sections[key as keyof Edition["sections"]]) continue;
    if ((await read.collection(`${base}/${collection}`)).length === 0) {
      issues.push({ path: ["sections", key], message: `Publish at least one item before turning ${key} on` });
    }
  }
  for (const [key, field] of Object.entries(EDITION_STRINGS)) {
    if (edition.sections[key as keyof Edition["sections"]] && !edition[field]?.length) {
      issues.push({ path: ["sections", key], message: `Add at least one item before turning ${key} on` });
    }
  }
  return issues;
}

async function siteIssues(read: FirestoreReader, site: SiteConfig): Promise<ContentIssue[]> {
  const issues: ContentIssue[] = [];
  if (!(await read.doc(`editions/${site.activeEdition}`))) {
    issues.push({ path: ["activeEdition"], message: `Publish DevFest ${site.activeEdition} before making it active` });
  }
  for (const [key, collection] of Object.entries(SITE_LISTS)) {
    if (site.sections[key as keyof SiteConfig["sections"]] && (await read.collection(collection)).length === 0) {
      issues.push({ path: ["sections", key], message: `Publish at least one item before turning ${key} on` });
    }
  }
  return issues;
}

export async function crossSectionIssues(def: SectionDef, value: Doc, read: FirestoreReader): Promise<ContentIssue[]> {
  const parsed = parseSectionId(def.id);
  if (parsed.type === "site-config") return siteIssues(read, value as SiteConfig);
  if (parsed.type !== "edition") return [];

  const base = `editions/${parsed.year}`;
  if (!parsed.collection) return editionDocIssues(read, parsed.year, value as Edition);

  const edition = (await read.doc(base)) as Edition | null;
  if (!edition) return [{ path: [], message: `Publish the DevFest ${parsed.year} event details first` }];
  const items = (value.items ?? []) as Doc[];
  if (parsed.collection === "sessions") {
    return sessionIssues(edition, items as Session[], (await read.collection(`${base}/speakers`)) as Speaker[]);
  }
  if (parsed.collection === "speakers") {
    return speakerIssues(edition, items as Speaker[], (await read.collection(`${base}/sessions`)) as Session[]);
  }
  return [];
}

export function speakersWithoutSessions(speakers: Speaker[], sessions: Session[]): string[] {
  const speaking = new Set(sessions.flatMap((session) => session.speakerIds));
  return speakers.filter((speaker) => !speaking.has(speaker.id)).map((speaker) => speaker.name);
}
