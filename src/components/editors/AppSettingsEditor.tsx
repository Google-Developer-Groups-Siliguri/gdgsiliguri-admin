"use client";

import { useMemo, useState } from "react";
import { Controller, useWatch } from "react-hook-form";

import { ChoiceChipsInput } from "@/components/editor/content-fields";
import { FormSection } from "@/components/editor/FormSection";
import { TextInput, UrlInput } from "@/components/editor/fields";
import { SectionEditorLayout } from "@/components/editor/SectionEditorLayout";
import { useDocForm } from "@/components/editor/useDocForm";
import { useSectionEditor, type SectionEditor } from "@/components/editor/useSectionEditor";
import { ConfirmDialog } from "@/components/m3/Dialog";
import { TextField } from "@/components/m3/TextField";
import type { SectionState } from "@/lib/cms/repository";
import type { SiteApp } from "@/lib/schema/v2";

import { docFormSchema } from "./forms";

const BUILD_NOTE = "The build number is the +NNNN part of the app version, for example 4100.";

type AppSettingsEditorProps = { state: SectionState<SiteApp>; modules: { id: string; title: string }[] };

export function AppSettingsEditor({ state, modules }: AppSettingsEditorProps) {
  const editor = useSectionEditor<SiteApp>(state);
  const { draft, setDraft, def } = editor;
  const schema = useMemo(() => docFormSchema<SiteApp>(def.schema.strict), [def]);
  const form = useDocForm<SiteApp>(schema, draft, setDraft);
  const { control } = form;
  const [pendingMinimum, setPendingMinimum] = useState<number | null>(null);
  const published = state.published.minSupportedBuild ?? 0;
  const [minimum, latest] = useWatch({ control, name: ["minSupportedBuild", "latestBuild"] }) as [number, number];

  return (
    <SectionEditorLayout editor={editor as unknown as SectionEditor} describePath={(path) => path.join(" · ")}>
      <FormSection title="Updates" description={BUILD_NOTE}>
        <Controller
          control={control}
          name="minSupportedBuild"
          render={({ field, fieldState }) => (
            <TextField
              label="Minimum supported build"
              type="number"
              value={field.value ?? ""}
              error={fieldState.error?.message}
              supportingText="Builds below this see a blocking “Update required” screen"
              onChange={(event) => {
                const value = Number(event.target.value);
                if (value > published) setPendingMinimum(value);
                else field.onChange(value);
              }}
            />
          )}
        />
        <Controller
          control={control}
          name="latestBuild"
          render={({ field, fieldState }) => (
            <TextField
              label="Latest build"
              type="number"
              value={field.value ?? ""}
              error={fieldState.error?.message}
              supportingText="Builds below this see a dismissible “Update available” banner"
              onChange={(event) => field.onChange(Number(event.target.value))}
            />
          )}
        />
        {minimum > latest && (
          <p className="px-1 text-body-small text-error">The minimum can&apos;t be higher than the latest build.</p>
        )}
        <TextInput control={control} name="updateMessage" label="Update message" multiline rows={3} />
        <UrlInput
          control={control}
          name={"storeUrls.android" as never}
          label="Google Play link"
          leadingIcon="android"
        />
        <UrlInput control={control} name={"storeUrls.ios" as never} label="App Store link" leadingIcon="phone_iphone" />
      </FormSection>
      <FormSection title="Emergency switches" description="Hide modules or show a message without an app release.">
        <ChoiceChipsInput
          control={control}
          name="disabledModules"
          label="Hidden modules"
          options={modules.map((module) => ({ value: module.id, label: module.title || module.id }))}
          supportingText="The app hides these even when they are enabled"
        />
        <TextInput
          control={control}
          name="maintenanceMessage"
          label="Maintenance message"
          supportingText="When set, the app shows it as a banner on every screen"
        />
      </FormSection>
      <ConfirmDialog
        open={pendingMinimum !== null}
        onOpenChange={(open) => !open && setPendingMinimum(null)}
        icon="system_update"
        destructive
        title={`Raise the minimum build to ${pendingMinimum}?`}
        description="Users on older builds will be blocked until they update."
        confirmLabel="Raise it"
        onConfirm={() => {
          if (pendingMinimum !== null)
            form.setValue("minSupportedBuild", pendingMinimum, { shouldDirty: true, shouldValidate: true });
          setPendingMinimum(null);
        }}
      />
    </SectionEditorLayout>
  );
}
