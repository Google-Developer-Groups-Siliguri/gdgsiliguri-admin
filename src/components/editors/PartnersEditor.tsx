"use client";

import type { z } from "zod";

import { ImageInput, TextInput, UrlInput } from "@/components/editor/fields";
import { ItemFormShell, useItemForm, warningsByField } from "@/components/editor/ItemForm";
import type { ItemFormProps } from "@/components/editor/ListEditor";
import { ListSectionEditor } from "@/components/editor/ListSectionEditor";
import type { SectionState } from "@/lib/content/repository";
import { strictSchemas, type Partner } from "@/lib/content/schemas";

function PartnerForm({ formId, item, isNew, issues, onSubmit }: ItemFormProps<Partner>) {
  const form = useItemForm<Partner>(strictSchemas.items.partner as unknown as z.ZodType<Partner, Partner>, item, isNew);
  const warnings = warningsByField(issues);
  const { control } = form;
  return (
    <ItemFormShell form={form} formId={formId} item={item} onSubmit={onSubmit}>
      <TextInput control={control} name="communityName" label="Community name" required autoFocus={isNew} />
      <ImageInput control={control} name="icon" label="Logo URL" required warning={warnings.icon} />
      <UrlInput
        control={control}
        name="socialMediaLink"
        label="Community link"
        warning={warnings.socialMediaLink}
        supportingText="Where the logo links to"
      />
    </ItemFormShell>
  );
}

export function PartnersEditor({ state }: { state: SectionState<"communityPartners"> }) {
  return (
    <ListSectionEditor
      state={state}
      noun="partner"
      fieldLabels={{ communityName: "Name", icon: "Logo", socialMediaLink: "Link" }}
      summarize={(partner) => ({
        primary: partner.communityName,
        secondary: partner.socialMediaLink,
        image: partner.icon,
      })}
      createItem={() => ({ communityName: "", icon: "", socialMediaLink: "" })}
      Form={PartnerForm}
    />
  );
}
