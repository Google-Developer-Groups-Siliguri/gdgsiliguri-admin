import { useMemo } from "react";
import { z } from "zod";

import { useEditingSection } from "@/components/editor/ListSectionEditor";
import { defaultAlt, stripEmpty } from "@/lib/schema/v2/clean";
import type { SectionDef } from "@/lib/sections/registry";

const PENDING_ID = "pending-id";

type WithId = { id?: string };

function withPendingId(value: unknown): unknown {
  const item = value as WithId;
  return item && typeof item === "object" && !item.id ? { ...item, id: PENDING_ID } : value;
}

export function itemFormSchema<T>(def: SectionDef, altFrom: Record<string, string> = {}): z.ZodType<T, T> {
  if (!def.itemSchema) throw new Error(`${def.id} has no item schema`);
  return z
    .preprocess((value) => withPendingId(defaultAlt(stripEmpty(value), altFrom)), def.itemSchema.strict)
    .transform((value) =>
      (value as WithId).id === PENDING_ID ? { ...(value as object), id: "" } : value,
    ) as unknown as z.ZodType<T, T>;
}

export function docFormSchema<T>(schema: z.ZodType): z.ZodType<T, T> {
  return z.preprocess((value) => stripEmpty(value), schema) as unknown as z.ZodType<T, T>;
}

export const PERSON_LINKS = ["linkedin", "github", "x", "website"] as const;

export function useItemSchema<T>(altFrom: Record<string, string> = {}): z.ZodType<T, T> {
  const def = useEditingSection();
  const key = JSON.stringify(altFrom);
  return useMemo(() => itemFormSchema<T>(def, JSON.parse(key)), [def, key]);
}
