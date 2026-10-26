import { z } from "zod";

import { APP_SLOTS, fields, listOf, MODULE_TYPES, WEB_SLOTS, type Mode, type ModuleType } from "./common";

export const ITEM_MODULE_TYPES = ["cards", "gallery", "links"] as const;
export type ItemModuleType = (typeof ITEM_MODULE_TYPES)[number];

export type FieldKind = "text" | "markdown" | "url" | "media" | "tags";
export type FieldMeta = { label: string; kind: FieldKind };

export const SOURCE_KIND: Record<ModuleType, "items" | "inline" | "showcase" | "blogs"> = {
  cards: "items",
  gallery: "items",
  links: "items",
  richText: "inline",
  showcase: "showcase",
  blogs: "blogs",
};

const WEB_PATH = /^\/[a-z0-9]+(?:[-/][a-z0-9]+)*$/;

export function isItemModule(type: string): type is ItemModuleType {
  return (ITEM_MODULE_TYPES as readonly string[]).includes(type);
}

export function buildModules(mode: Mode) {
  const f = fields(mode);
  const meta = (label: string, kind: FieldKind) => ({ label, kind }) satisfies FieldMeta;

  const source = z.discriminatedUnion("kind", [
    f.object({ kind: z.literal("items") }),
    f.object({ kind: z.literal("inline"), body: f.requiredMarkdown("Text") }),
    f.object({
      kind: z.literal("showcase"),
      edition: z.number().int().optional(),
      featuredOnly: z.boolean().optional(),
      limit: z.number().int().min(1).max(100).optional(),
    }),
    f.object({
      kind: z.literal("blogs"),
      limit: z.number().int().min(1).max(50).optional(),
      tag: z.string().optional(),
    }),
  ]);

  const placement = f.object({
    app: f.required(f.object({ slot: f.enumOf(APP_SLOTS, "App slot"), order: f.order() })),
    web: f.required(
      f.object({
        slot: f.enumOf(WEB_SLOTS, "Website slot"),
        order: f.order(),
        path: f.strict ? z.string().regex(WEB_PATH, "Use a path like /showcase").optional() : z.string().optional(),
      }),
    ),
  });

  const moduleDocBase = f.object({
    id: f.slug("Module id"),
    type: f.enumOf(MODULE_TYPES, "Type"),
    title: f.requiredText("Title", 100),
    subtitle: f.optionalText("Subtitle", 200),
    icon: f.optionalText("Icon", 60),
    edition: z.number().int().optional(),
    source: f.strict ? source : source.default({ kind: "items" }),
    placement: f.required(placement),
    minAppBuild: z.number().int().min(0).optional(),
    enabled: f.flag(false),
    updatedAt: f.optionalInstant(),
  });

  const moduleDoc = moduleDocBase.superRefine((value, context) => {
    if (!f.strict) return;
    if (SOURCE_KIND[value.type as ModuleType] !== value.source.kind) {
      context.addIssue({
        code: "custom",
        path: ["source", "kind"],
        message: `A ${value.type} module needs a "${SOURCE_KIND[value.type as ModuleType]}" source`,
      });
    }
    if (value.placement.web.slot === "page" && !value.placement.web.path) {
      context.addIssue({ code: "custom", path: ["placement", "web", "path"], message: "A page module needs a path" });
    }
  });

  const itemBase = { id: f.docId(), order: f.order(), updatedAt: f.optionalInstant() };

  const cardItem = f.object({
    ...itemBase,
    title: f.requiredText("Title", 200).meta(meta("Title", "text")),
    body: f.markdown("Text").optional().meta(meta("Text", "markdown")),
    image: f.media("Image").optional().meta(meta("Image", "media")),
    url: f.optionalUrl("The link").meta(meta("Link", "url")),
    tags: z.array(z.string()).optional().meta(meta("Tags", "tags")),
  });

  const galleryItem = f.object({
    ...itemBase,
    image: f.required(f.media("Image", { altRequired: true })).meta(meta("Image", "media")),
    caption: f.optionalText("Caption", 300).meta(meta("Caption", "text")),
  });

  const linkItem = f.object({
    ...itemBase,
    label: f.requiredText("Label", 100).meta(meta("Label", "text")),
    url: f.url("The link").meta(meta("Link", "url")),
    description: f.optionalText("Description", 300).meta(meta("Description", "text")),
    icon: f.optionalText("Icon", 60).meta(meta("Icon", "text")),
  });

  const itemSchemas = { cards: cardItem, gallery: galleryItem, links: linkItem } as const;

  const modules = listOf(moduleDoc, mode).superRefine((value, context) => {
    if (mode !== "strict") return;
    const paths = new Map<string, number>();
    value.items.forEach((module, index) => {
      const path = module.placement.web.slot === "page" ? module.placement.web.path : undefined;
      if (!path) return;
      const first = paths.get(path);
      if (first !== undefined) {
        context.addIssue({
          code: "custom",
          path: ["items", index, "placement", "web", "path"],
          message: `The path ${path} is already used by module ${first + 1}`,
        });
      } else {
        paths.set(path, index);
      }
    });
  });

  return {
    moduleDocBase,
    moduleDoc,
    modules,
    cardItem,
    galleryItem,
    linkItem,
    itemSchemas,
    moduleItems: (type: ItemModuleType) => listOf(itemSchemas[type], mode),
  };
}
