"use client";

import { useMemo, useState } from "react";
import { Controller, useWatch } from "react-hook-form";

import { LinksInput } from "@/components/editor/content-fields";
import { FormSection } from "@/components/editor/FormSection";
import { SegmentedInput, TextInput, UrlInput } from "@/components/editor/fields";
import { SectionEditorLayout } from "@/components/editor/SectionEditorLayout";
import { useDocForm } from "@/components/editor/useDocForm";
import { useSectionEditor, type SectionEditor } from "@/components/editor/useSectionEditor";
import { ConfirmDialog } from "@/components/m3/Dialog";
import { Select } from "@/components/m3/Select";
import { Switch } from "@/components/m3/Switch";
import { TextField } from "@/components/m3/TextField";
import type { SectionState } from "@/lib/cms/repository";
import { LINK_KEYS, SITE_SECTION_KEYS, type Edition, type SiteConfig, type SiteSectionKey } from "@/lib/schema/v2";
import { isEventMode } from "@/lib/schema/v2/event-mode";
import { formatEventMoment } from "@/lib/time";
import { toMillis } from "@/lib/time/tz";

import { docFormSchema } from "./forms";

const SECTION_LABELS: Record<SiteSectionKey, string> = {
  team: "Team",
  events: "Community events",
  testimonials: "Reviews",
  faqs: "Community FAQ",
  blogs: "Blog posts",
  showcase: "Project showcase",
  pastEditions: "Past DevFests",
};

type SiteEditorProps = {
  state: SectionState<SiteConfig>;
  editions: Pick<Edition, "year" | "title" | "startAt" | "endAt">[];
};

function eventModeSummary(site: SiteConfig, edition: SiteEditorProps["editions"][number] | undefined): string {
  const on = isEventMode(site, edition);
  if (site.eventMode !== "auto") return `Event mode is ${on ? "ON" : "OFF"} because it is set to ${site.eventMode}.`;
  if (!edition) return `Event mode is OFF because DevFest ${site.activeEdition} has no dates yet.`;
  const end = formatEventMoment(toMillis(edition.endAt));
  return on
    ? `Event mode is currently ON because ${edition.title} ends on ${end}.`
    : `Event mode is currently OFF. ${edition.title} ends on ${end}.`;
}

export function SiteEditor({ state, editions }: SiteEditorProps) {
  const editor = useSectionEditor<SiteConfig>(state);
  const { draft, setDraft, def } = editor;
  const schema = useMemo(() => docFormSchema<SiteConfig>(def.schema.strict), [def]);
  const form = useDocForm<SiteConfig>(schema, draft, setDraft);
  const { control } = form;
  const [pendingEdition, setPendingEdition] = useState<number | null>(null);
  const values = useWatch({ control }) as SiteConfig;
  const active = editions.find((edition) => edition.year === values.activeEdition);

  return (
    <SectionEditorLayout editor={editor as unknown as SectionEditor} describePath={(path) => path.join(" · ")}>
      <FormSection title="Community" description="Who GDG Siliguri is and how to reach it.">
        <TextInput control={control} name="name" label="Name" required />
        <TextInput control={control} name="tagline" label="Tagline" />
        <TextInput control={control} name="description" label="Description" required multiline rows={4} showCounter />
        <TextInput control={control} name="email" label="Email" required />
        <UrlInput control={control} name="joinUrl" label="Join link" leadingIcon="group_add" />
        <TextInput control={control} name="region" label="Region" />
      </FormSection>

      <FormSection title="Social links" description="Shown in the footer and the app's About screen.">
        <LinksInput control={control} name="links" keys={[...LINK_KEYS]} optional={false} />
      </FormSection>

      <FormSection title="Get the app" description="Store links for the website's app prompt.">
        <UrlInput control={control} name={"appLinks.android" as never} label="Google Play" leadingIcon="android" />
        <UrlInput control={control} name={"appLinks.ios" as never} label="App Store" leadingIcon="phone_iphone" />
      </FormSection>

      <FormSection title="DevFest" description="Which edition the app and website treat as this DevFest.">
        <Controller
          control={control}
          name="activeEdition"
          render={({ field }) => (
            <Select
              label="Active DevFest"
              value={String(field.value)}
              options={editions.map((edition) => ({ value: String(edition.year), label: edition.title }))}
              onValueChange={(value) => setPendingEdition(Number(value))}
            />
          )}
        />
        <SegmentedInput
          control={control}
          name="eventMode"
          label="Event mode"
          segments={[
            { value: "auto", label: "Auto" },
            { value: "on", label: "On" },
            { value: "off", label: "Off" },
          ]}
        />
        <p className="px-1 text-body-medium text-on-surface" aria-live="polite">
          {eventModeSummary(values, active)}
        </p>
        {values.eventMode === "auto" && (
          <Controller
            control={control}
            name="eventModeLeadDays"
            render={({ field }) => (
              <TextField
                label="Days before the event"
                type="number"
                value={field.value ?? ""}
                supportingText="Leave empty to stay in event mode the whole time before the event"
                onChange={(event) => field.onChange(event.target.value === "" ? undefined : Number(event.target.value))}
              />
            )}
          />
        )}
      </FormSection>

      <FormSection
        title="Community sections"
        description="What the website and the app show. These change with the next publish."
      >
        {SITE_SECTION_KEYS.map((key) => (
          <label
            key={key}
            className="flex h-14 cursor-pointer items-center justify-between gap-4 rounded-full bg-surface-container-high ps-5 pe-2.5"
          >
            <span className="text-label-large text-on-surface">{SECTION_LABELS[key]}</span>
            <Switch
              checked={Boolean(draft.sections[key])}
              aria-label={`Show ${SECTION_LABELS[key]}`}
              onCheckedChange={(value) =>
                setDraft((current) => ({ ...current, sections: { ...current.sections, [key]: value } }))
              }
            />
          </label>
        ))}
      </FormSection>

      <ConfirmDialog
        open={pendingEdition !== null}
        onOpenChange={(open) => !open && setPendingEdition(null)}
        icon="swap_horiz"
        title={`Switch to DevFest ${pendingEdition}?`}
        description={`After you publish, the app and website will switch to DevFest ${pendingEdition}.`}
        confirmLabel="Switch"
        onConfirm={() => {
          if (pendingEdition !== null)
            form.setValue("activeEdition", pendingEdition, { shouldDirty: true, shouldValidate: true });
          setPendingEdition(null);
        }}
      />
    </SectionEditorLayout>
  );
}
