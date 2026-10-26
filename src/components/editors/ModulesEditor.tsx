"use client";

import { createContext, use, useMemo } from "react";
import { Controller, useWatch, type Control } from "react-hook-form";
import { z } from "zod";

import { EditionSelectInput, MarkdownInput } from "@/components/editor/content-fields";
import { FormSection } from "@/components/editor/FormSection";
import { SelectInput, SwitchInput, TextInput } from "@/components/editor/fields";
import { ItemFormShell, useItemForm, warningsByField } from "@/components/editor/ItemForm";
import type { ItemFormProps } from "@/components/editor/ListEditor";
import { IdNote, ListSectionEditor, useEditingSection, usePublishedIds } from "@/components/editor/ListSectionEditor";
import { TextField } from "@/components/m3/TextField";
import { useRegistry } from "@/components/registry/RegistryProvider";
import type { SectionState } from "@/lib/cms/repository";
import { APP_SLOTS, MODULE_TYPES, SOURCE_KIND, WEB_SLOTS, type ModuleDoc, type ModuleType } from "@/lib/schema/v2";

import { itemFormSchema } from "./forms";

const TYPE_LABELS: Record<ModuleType, string> = {
  cards: "Cards",
  gallery: "Gallery",
  links: "Links",
  richText: "Text",
  showcase: "Project showcase",
  blogs: "Blog posts",
};

const APP_SLOT_LABELS: Record<string, string> = {
  homeCard: "Home card",
  eventSection: "Event tab section",
  aboutSection: "About section",
  tab: "Its own tab",
  none: "Not in the app",
};

const WEB_SLOT_LABELS: Record<string, string> = {
  page: "Its own page",
  homeSection: "Home page section",
  devfestSection: "DevFest page section",
  none: "Not on the website",
};

const LatestBuildContext = createContext(0);

function withSourceKind(value: unknown): unknown {
  const doc = value as Partial<ModuleDoc> | undefined;
  if (!doc || typeof doc !== "object" || !doc.type) return value;
  const kind = SOURCE_KIND[doc.type as ModuleType] ?? "items";
  const source = { ...(doc.source as Record<string, unknown> | undefined), kind };
  return { ...doc, source };
}

function NumberInput({
  control,
  name,
  label,
  supportingText,
}: {
  control: Control<ModuleDoc>;
  name: string;
  label: string;
  supportingText?: string;
}) {
  return (
    <Controller
      control={control}
      name={name as never}
      render={({ field, fieldState }) => (
        <TextField
          label={label}
          type="number"
          value={(field.value as number | undefined) ?? ""}
          error={fieldState.error?.message}
          supportingText={supportingText}
          onChange={(event) => field.onChange(event.target.value === "" ? undefined : Number(event.target.value))}
        />
      )}
    />
  );
}

function ModuleForm({ formId, item, isNew, issues, onSubmit }: ItemFormProps<ModuleDoc>) {
  const def = useEditingSection();
  const latestBuild = use(LatestBuildContext);
  const published = usePublishedIds();
  const { editionYears } = useRegistry();
  const schema = useMemo(
    () => z.preprocess(withSourceKind, itemFormSchema<ModuleDoc>(def)) as unknown as z.ZodType<ModuleDoc, ModuleDoc>,
    [def],
  );
  const form = useItemForm<ModuleDoc>(schema, item, isNew);
  const warnings = warningsByField(issues);
  const { control } = form;
  const [type, webSlot] = useWatch({ control, name: ["type", "placement.web.slot"] }) as [ModuleType, string];
  const locked = published.has(item.id);

  return (
    <ItemFormShell
      form={form}
      formId={formId}
      item={item}
      onSubmit={(value) => onSubmit(withSourceKind(value) as ModuleDoc)}
    >
      {locked ? (
        <p className="px-1 text-body-medium text-on-surface">Type: {TYPE_LABELS[item.type]}</p>
      ) : (
        <SelectInput
          control={control}
          name="type"
          label="Type"
          required
          options={MODULE_TYPES.map((value) => ({ value, label: TYPE_LABELS[value] }))}
        />
      )}
      <TextInput control={control} name="title" label="Title" required autoFocus={isNew} warning={warnings.title} />
      <IdNote id={item.id} />
      <TextInput control={control} name="subtitle" label="Subtitle" />
      <TextInput
        control={control}
        name="icon"
        label="Icon"
        supportingText="A Material Symbols name, for example rocket_launch"
      />
      <EditionSelectInput
        control={control}
        name="edition"
        label="DevFest"
        years={editionYears}
        noneLabel="Not tied to a DevFest"
      />

      {type === "richText" && <MarkdownInput control={control} name={"source.body" as never} label="Text" required />}
      {type === "showcase" && (
        <FormSection title="Projects" stacked>
          <NumberInput control={control} name="source.edition" label="Only projects from DevFest" />
          <SwitchInput control={control} name={"source.featuredOnly" as never} label="Featured projects only" />
          <NumberInput control={control} name="source.limit" label="How many" />
        </FormSection>
      )}
      {type === "blogs" && (
        <FormSection title="Posts" stacked>
          <NumberInput control={control} name="source.limit" label="How many" />
          <TextInput control={control} name={"source.tag" as never} label="Only posts tagged" />
        </FormSection>
      )}

      <FormSection title="In the app" stacked>
        <SelectInput
          control={control}
          name={"placement.app.slot" as never}
          label="Where"
          options={APP_SLOTS.map((value) => ({ value, label: APP_SLOT_LABELS[value] }))}
        />
        <NumberInput control={control} name="placement.app.order" label="Order" />
        <NumberInput
          control={control}
          name="minAppBuild"
          label="Minimum app build"
          supportingText={`Older builds skip this module. The latest build is ${latestBuild}.`}
        />
      </FormSection>
      <FormSection title="On the website" stacked>
        <SelectInput
          control={control}
          name={"placement.web.slot" as never}
          label="Where"
          options={WEB_SLOTS.map((value) => ({ value, label: WEB_SLOT_LABELS[value] }))}
        />
        <NumberInput control={control} name="placement.web.order" label="Order" />
        {webSlot === "page" && (
          <TextInput
            control={control}
            name={"placement.web.path" as never}
            label="Page path"
            required
            supportingText="For example /showcase"
          />
        )}
      </FormSection>
      <SwitchInput
        control={control}
        name="enabled"
        label="Enabled"
        supportingText="Shown on the website and in the app after publishing"
      />
    </ItemFormShell>
  );
}

export function ModulesEditor({
  state,
  latestBuild,
}: {
  state: SectionState<{ items: ModuleDoc[] }>;
  latestBuild: number;
}) {
  return (
    <LatestBuildContext value={latestBuild}>
      <ListSectionEditor<ModuleDoc>
        state={state}
        noun="module"
        fieldLabels={{ title: "Title", type: "Type", placement: "Placement", source: "Content" }}
        showThumbnails={false}
        keepOrder
        summarize={(module) => ({
          primary: module.title,
          secondary: [
            TYPE_LABELS[module.type] ?? module.type,
            WEB_SLOT_LABELS[module.placement?.web?.slot] ?? "",
            module.edition ? `DevFest ${module.edition}` : "",
          ]
            .filter(Boolean)
            .join(" · "),
          meta: module.enabled ? "Enabled" : "Off",
        })}
        createItem={() =>
          ({
            id: "",
            type: "cards",
            title: "",
            source: { kind: "items" },
            placement: { app: { slot: "homeCard", order: 100 }, web: { slot: "homeSection", order: 100 } },
            minAppBuild: latestBuild + 1,
            enabled: false,
          }) as ModuleDoc
        }
        Form={ModuleForm}
      />
    </LatestBuildContext>
  );
}
