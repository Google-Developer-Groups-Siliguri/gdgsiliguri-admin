import type { MigrationReport, V2Data } from "./from-rtdb";

function table(headers: string[], rows: string[][]): string[] {
  if (rows.length === 0) return ["_None._"];
  return [
    `| ${headers.join(" | ")} |`,
    `|${headers.map(() => "---").join("|")}|`,
    ...rows.map((row) => `| ${row.join(" | ")} |`),
  ];
}

function counts(data: V2Data): string[][] {
  const rows: string[][] = [];
  for (const [year, content] of Object.entries(data.editions)) {
    rows.push([
      `editions/${year}`,
      `${content.sessions.length} sessions, ${content.speakers.length} speakers, ${content.sponsors.length} sponsors, ${content.partners.length} partners, ${content.faqs.length} FAQs`,
    ]);
  }
  rows.push(["team", String(data.team.length)]);
  rows.push(["events", String(data.events.length)]);
  rows.push(["testimonials", String(data.testimonials.length)]);
  rows.push(["faqs", String(data.faqs.length)]);
  return rows;
}

export function migrationReportMarkdown(data: V2Data, { source, date }: { source: string; date: string }): string {
  const report: MigrationReport = data.report;
  const collided = report.collidedIds.map((entry) => [entry.collection, entry.base, entry.id]);
  const generated = new Map<string, number>();
  for (const entry of report.generatedIds) generated.set(entry.collection, (generated.get(entry.collection) ?? 0) + 1);
  return [
    `# Firestore v2 migration report`,
    "",
    `Source: ${source} · ${date}`,
    "",
    "## Notes",
    "",
    ...report.notes.map((note) => `- ${note}`),
    "",
    "## What will be written",
    "",
    ...table(["Collection", "Documents"], counts(data)),
    "",
    `Active edition: ${data.site.activeEdition} · event mode: ${data.site.eventMode}`,
    "",
    "## Session speakers that matched no speaker",
    "",
    ...table(
      ["Session", "Name in the schedule"],
      report.unmatchedSpeakers.map((entry) => [entry.session, entry.name]),
    ),
    "",
    "## AM/PM anomalies",
    "",
    ...table(
      ["Session", "Start", "End", "Why"],
      report.amPmAnomalies.map((entry) => [entry.session, entry.startTime, entry.endTime, entry.reason]),
    ),
    "",
    "## Ids that collided",
    "",
    ...table(["Collection", "Wanted", "Used"], collided),
    "",
    "## Generated ids",
    "",
    ...table(
      ["Collection", "Count"],
      [...generated.entries()].map(([collection, count]) => [collection, String(count)]),
    ),
    "",
    `## Cleaned URLs (${report.cleanedUrls.length})`,
    "",
    ...table(
      ["Path", "Before", "After"],
      report.cleanedUrls.map((entry) => [entry.path, entry.from, entry.to]),
    ),
    "",
    `Dropped ${report.droppedEmpty.length} empty values (they are omitted in v2).`,
    "",
  ].join("\n");
}
