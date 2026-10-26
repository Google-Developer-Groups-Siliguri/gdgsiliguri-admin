import { z } from "zod";

export type Mode = "lenient" | "strict";

export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const DOC_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]{0,59}$/;
export const MAPS_EMBED_PATTERN = /^https:\/\/www\.google\.com\/maps\/embed\?pb=[^"\s]+$/;
export const HEX_COLOR_PATTERN = /^#[0-9A-Fa-f]{6}$/;
export const MAX_LIST_ITEMS = 200;
export const MAX_MARKDOWN = 5_000;

export const SESSION_TYPES = [
  "keynote",
  "talk",
  "workshop",
  "panel",
  "lightning",
  "break",
  "registration",
  "networking",
  "other",
] as const;
export const SESSION_LEVELS = ["beginner", "intermediate", "advanced"] as const;
export const TEAM_ROLES = ["organizer", "volunteer", "alumni"] as const;
export const SPONSOR_TIERS = ["platinum", "gold", "silver", "bronze", "community", "venue", "media"] as const;
export const EVENT_MODES = ["auto", "on", "off"] as const;
export const MODULE_TYPES = ["cards", "gallery", "links", "richText", "showcase", "blogs"] as const;
export const APP_SLOTS = ["homeCard", "eventSection", "aboutSection", "tab", "none"] as const;
export const WEB_SLOTS = ["page", "homeSection", "devfestSection", "none"] as const;
export const LINK_KEYS = ["website", "github", "linkedin", "x", "instagram", "facebook", "youtube", "medium"] as const;

export type SessionType = (typeof SESSION_TYPES)[number];
export type TeamRole = (typeof TEAM_ROLES)[number];
export type SponsorTier = (typeof SPONSOR_TIERS)[number];
export type EventMode = (typeof EVENT_MODES)[number];
export type ModuleType = (typeof MODULE_TYPES)[number];
export type LinkKey = (typeof LINK_KEYS)[number];

const UNSAFE_URL = /["\s]/;

export function isHttpsUrl(value: string): boolean {
  if (!value.startsWith("https://") || UNSAFE_URL.test(value)) return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname.includes(".");
  } catch {
    return false;
  }
}

function hasUnsafeMarkup(value: string): boolean {
  return /<\s*(script|iframe)\b/i.test(value);
}

export function fields(mode: Mode) {
  const strict = mode === "strict";

  const object = <S extends z.ZodRawShape>(shape: S) => (strict ? z.strictObject(shape) : z.looseObject(shape));

  const required = <T extends z.ZodType>(schema: T) => (strict ? schema : schema.prefault({} as never));

  const requiredText = (label = "This", max = 500) =>
    strict
      ? z.string().trim().min(1, `${label} is required`).max(max, `${label} must be ${max} characters or fewer`)
      : z.string().default("");

  const optionalText = (label = "This", max = 500) =>
    strict
      ? z.string().trim().max(max, `${label} must be ${max} characters or fewer`).optional()
      : z.string().optional();

  const markdown = (label = "This") =>
    strict
      ? z
          .string()
          .max(MAX_MARKDOWN, `${label} must be ${MAX_MARKDOWN} characters or fewer`)
          .refine((value) => !hasUnsafeMarkup(value), `${label} can't contain <script> or <iframe>`)
      : z.string();

  const requiredMarkdown = (label = "This") =>
    strict ? markdown(label).refine((value) => value.trim() !== "", `${label} is required`) : z.string().default("");

  const url = (label = "This link") =>
    strict ? z.string().refine(isHttpsUrl, `${label} must be a full https:// link`) : z.string().default("");

  const optionalUrl = (label = "This link") =>
    strict ? z.string().refine(isHttpsUrl, `${label} must be a full https:// link`).optional() : z.string().optional();

  const embedUrl = () =>
    strict
      ? z
          .string()
          .regex(MAPS_EMBED_PATTERN, "Paste only the https://www.google.com/maps/embed?pb=… link, not the whole iframe")
          .optional()
      : z.string().optional();

  const slug = (label = "Id") =>
    strict
      ? z.string().regex(SLUG_PATTERN, `${label} must use lowercase letters, numbers and hyphens`).max(60)
      : z.string().default("");

  const docId = () => (strict ? z.string().regex(DOC_ID_PATTERN, "Invalid id") : z.string().default(""));

  const instant = (label = "Time") =>
    strict ? z.iso.datetime({ offset: true, message: `${label} must be a date and time` }) : z.string().default("");

  const optionalInstant = (label = "Time") =>
    strict
      ? z.iso.datetime({ offset: true, message: `${label} must be a date and time` }).optional()
      : z.string().optional();

  const order = () => (strict ? z.number().int().min(0) : z.number().default(0));

  const count = () => (strict ? z.number().int().min(0) : z.number());

  const flag = (fallback: boolean) => (strict ? z.boolean() : z.boolean().default(fallback));

  const enumOf = <const T extends readonly [string, ...string[]]>(values: T, label: string) =>
    strict
      ? z.enum(values, { message: `${label} must be one of ${values.join(", ")}` })
      : (z.string().default(values[0]) as unknown as z.ZodDefault<z.ZodEnum<{ [K in T[number]]: K }>>);

  const stringList = (label = "Item", max = 500) => z.array(requiredText(label, max)).default([]);

  const media = (label = "Image", { altRequired = false }: { altRequired?: boolean } = {}) =>
    object({
      url: url(label),
      alt:
        strict && altRequired
          ? requiredText(`${label} description`, 300)
          : strict
            ? z.string().max(300)
            : z.string().default(""),
      width: count().optional(),
      height: count().optional(),
    });

  const links = () =>
    object(
      Object.fromEntries(LINK_KEYS.map((key) => [key, optionalUrl(`The ${key} link`)])) as {
        [K in LinkKey]: ReturnType<typeof optionalUrl>;
      },
    );

  const geo = () => object({ lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180) });

  const venue = () =>
    object({
      name: requiredText("Venue name", 200),
      address: optionalText("Address", 300),
      geo: geo().optional(),
      mapsUrl: optionalUrl("The maps link"),
      embedUrl: embedUrl(),
      image: media("Venue image").optional(),
    });

  return {
    strict,
    object,
    required,
    requiredText,
    optionalText,
    markdown,
    requiredMarkdown,
    url,
    optionalUrl,
    embedUrl,
    slug,
    docId,
    instant,
    optionalInstant,
    order,
    count,
    flag,
    enumOf,
    stringList,
    media,
    links,
    geo,
    venue,
  };
}

export type Fields = ReturnType<typeof fields>;

type Identified = { id: string };

export function uniqueIds(items: Identified[], context: z.RefinementCtx, path: PropertyKey[] = ["items"]): void {
  const seen = new Map<string, number>();
  items.forEach((item, index) => {
    const first = seen.get(item.id);
    if (first !== undefined) {
      context.addIssue({
        code: "custom",
        path: [...path, index, "id"],
        message: `Id "${item.id}" is already used by item ${first + 1}`,
      });
    } else {
      seen.set(item.id, index);
    }
  });
}

export function listOf<T extends z.ZodType<Identified>>(item: T, mode: Mode) {
  if (mode === "lenient") return z.looseObject({ items: z.array(item).default([]) });
  const items = z.array(item).max(MAX_LIST_ITEMS, `A list can have at most ${MAX_LIST_ITEMS} items`);
  return z.strictObject({ items }).superRefine((value, context) => uniqueIds(value.items as Identified[], context));
}
