"use client";

import { MediaInput } from "@/components/editor/content-fields";
import { TextInput, UrlInput } from "@/components/editor/fields";
import { ItemFormShell, useItemForm, warningsByField } from "@/components/editor/ItemForm";
import type { ItemFormProps } from "@/components/editor/ListEditor";
import { IdNote, ListSectionEditor } from "@/components/editor/ListSectionEditor";
import type { Visibility } from "@/lib/cms/queries";
import type { SectionState } from "@/lib/cms/repository";
import { sectionWarnings } from "@/lib/cms/warnings";
import type { Partner } from "@/lib/schema/v2";

import { useItemSchema } from "./forms";

function PartnerForm({ formId, item, isNew, issues, onSubmit }: ItemFormProps<Partner>) {
  const form = useItemForm<Partner>(useItemSchema<Partner>({ logo: "name" }), item, isNew);
  const warnings = warningsByField(issues);
  const { control } = form;
  return (
    <ItemFormShell form={form} formId={formId} item={item} onSubmit={onSubmit}>
      <TextInput control={control} name="name" label="Community name" required autoFocus={isNew} />
      <IdNote id={item.id} />
      <MediaInput
        control={control}
        name="logo"
        label="Logo URL"
        required
        warning={warnings["logo.url"]}
        altLabel="Logo description"
      />
      <UrlInput
        control={control}
        name="url"
        label="Community link"
        warning={warnings.url}
        supportingText="Where the logo links to"
      />
    </ItemFormShell>
  );
}

export function PartnersEditor({
  state,
  visibility,
}: {
  state: SectionState<{ items: Partner[] }>;
  visibility: Visibility;
}) {
  return (
    <ListSectionEditor<Partner>
      state={state}
      visibility={visibility}
      noun="partner"
      fieldLabels={{ name: "Name", logo: "Logo", url: "Link" }}
      warnings={(draft) => sectionWarnings(state.id, draft)}
      summarize={(partner) => ({ primary: partner.name, secondary: partner.url, image: partner.logo?.url })}
      createItem={() => ({ id: "", name: "", logo: { url: "", alt: "" }, order: 0 })}
      Form={PartnerForm}
    />
  );
}
