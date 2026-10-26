import { ContentError } from "./errors";
import { SPONSOR_TIERS } from "@/lib/legacy/schemas";
import { SECTIONS, type SectionKey } from "./sections";

type Json = Record<string, unknown>;

function emptyListError(label: string): ContentError {
  return new ContentError(
    `${label} has no items. Add at least one, or turn the section off instead.`,
    "empty_section",
  );
}

function withoutEmptyData(value: Json, label: string): Json {
  const data = value.data;
  if (Array.isArray(data) && data.length === 0) {
    if (value.enabled) throw emptyListError(label);
    const rest = { ...value };
    delete rest.data;
    return rest;
  }
  return value;
}

function stripUndefined(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stripUndefined);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, entry]) => entry !== undefined)
        .map(([key, entry]) => [key, stripUndefined(entry)]),
    );
  }
  return value;
}

export function toRtdbValue(key: SectionKey, value: unknown): Json {
  const label = SECTIONS[key].label;
  const record = stripUndefined(value) as Json;

  if (key === "eventDetails") {
    return {
      ...record,
      perks: withoutEmptyData(record.perks as Json, "Perks"),
      pointsToNote: withoutEmptyData(record.pointsToNote as Json, "Points to note"),
    };
  }

  if (key === "sponsors") {
    const result: Json = { ...record };
    for (const tier of SPONSOR_TIERS) {
      if (Array.isArray(result[tier]) && (result[tier] as unknown[]).length === 0) delete result[tier];
    }
    const remaining = SPONSOR_TIERS.some((tier) => Array.isArray(result[tier]));
    if (record.enabled && !remaining) throw emptyListError(label);
    return result;
  }

  if (key === "events") {
    const data = Array.isArray(record.data) ? (record.data as Json[]) : [];
    const events = data.map((event) =>
      Array.isArray(event.speakers) && event.speakers.length === 0
        ? Object.fromEntries(Object.entries(event).filter(([field]) => field !== "speakers"))
        : event,
    );
    return withoutEmptyData({ ...record, data: events }, label);
  }

  return withoutEmptyData(record, label);
}
