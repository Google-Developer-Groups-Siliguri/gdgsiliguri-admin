"use client";

import type { z } from "zod";

import { MarkdownInput, MediaInput, TagsInput } from "@/components/editor/content-fields";
import { TextInput, UrlInput } from "@/components/editor/fields";
import { ItemFormShell, useItemForm, warningsByField } from "@/components/editor/ItemForm";
import type { ItemFormProps } from "@/components/editor/ListEditor";
import { ListSectionEditor, useEditingSection } from "@/components/editor/ListSectionEditor";
import type { SectionState } from "@/lib/cms/repository";
import type { ModuleItem } from "@/lib/schema/v2";
import type { FieldMeta } from "@/lib/schema/v2/modules";

import { useItemSchema } from "./forms";

type Field = { name: string; meta: FieldMeta; optional: boolean };

export function schemaFields(schema: z.ZodType | undefined): Field[] {
  const shape = (schema as { shape?: Record<string, z.ZodType> } | undefined)?.shape ?? {};
  return Object.entries(shape).flatMap(([name, field]) => {
    const meta = field.meta() as FieldMeta | undefined;
    return meta?.kind ? [{ name, meta, optional: field.safeParse(undefined).success }] : [];
  });
}

function SchemaForm({ formId, item, isNew, issues, onSubmit }: ItemFormProps<ModuleItem>) {
  const def = useEditingSection();
  const form = useItemForm<ModuleItem>(useItemSchema<ModuleItem>({ image: "title" }), item, isNew);
  const warnings = warningsByField(issues);
  const { control } = form;
  const fields = schemaFields(def.itemSchema?.strict);
  return (
    <ItemFormShell form={form} formId={formId} item={item} onSubmit={onSubmit}>
      {fields.map(({ name, meta, optional }, index) => {
        const props = { control, name: name as never, label: meta.label, required: !optional, warning: warnings[name] };
        switch (meta.kind) {
          case "markdown":
            return <MarkdownInput key={name} {...props} rows={4} />;
          case "url":
            return <UrlInput key={name} {...props} />;
          case "media":
            return <MediaInput key={name} {...props} label={`${meta.label} URL`} optional={optional} />;
          case "tags":
            return <TagsInput key={name} control={control} name={name as never} label={meta.label} />;
          default:
            return <TextInput key={name} {...props} autoFocus={isNew && index === 0} />;
        }
      })}
    </ItemFormShell>
  );
}

function primaryText(item: ModuleItem): string {
  if ("title" in item && item.title) return item.title;
  if ("label" in item && item.label) return item.label;
  if ("caption" in item && item.caption) return item.caption;
  return "";
}

export function ModuleItemsEditor({ state, noun }: { state: SectionState<{ items: ModuleItem[] }>; noun: string }) {
  return (
    <ListSectionEditor<ModuleItem>
      state={state}
      noun={noun}
      fieldLabels={{ title: "Title", label: "Label", url: "Link", image: "Image" }}
      summarize={(item) => ({
        primary: primaryText(item),
        secondary: "url" in item ? item.url : undefined,
        image: "image" in item ? item.image?.url : undefined,
      })}
      createItem={() => ({ id: "", order: 0 }) as ModuleItem}
      Form={SchemaForm}
    />
  );
}
