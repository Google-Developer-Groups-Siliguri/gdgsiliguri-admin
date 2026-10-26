import type { Edition, SiteConfig } from "./index";

const DAY_MS = 24 * 3600_000;

export function isEventMode(
  site: Pick<SiteConfig, "eventMode" | "eventModeLeadDays">,
  edition: Pick<Edition, "startAt" | "endAt"> | null | undefined,
  now = Date.now(),
): boolean {
  if (site.eventMode === "on") return true;
  if (site.eventMode === "off" || !edition) return false;
  const start =
    site.eventModeLeadDays === undefined || site.eventModeLeadDays === null
      ? Number.NEGATIVE_INFINITY
      : Date.parse(edition.startAt) - site.eventModeLeadDays * DAY_MS;
  return start <= now && now < Date.parse(edition.endAt) + DAY_MS;
}
