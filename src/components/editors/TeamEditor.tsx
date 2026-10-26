"use client";

import { ChoiceChipsInput, LinksInput, MediaInput } from "@/components/editor/content-fields";
import { SegmentedInput, SwitchInput, TextInput } from "@/components/editor/fields";
import { ItemFormShell, useItemForm, warningsByField } from "@/components/editor/ItemForm";
import type { ItemFormProps } from "@/components/editor/ListEditor";
import { IdNote, ListSectionEditor } from "@/components/editor/ListSectionEditor";
import { useRegistry } from "@/components/registry/RegistryProvider";
import type { Visibility } from "@/lib/cms/queries";
import type { SectionState } from "@/lib/cms/repository";
import { sectionWarnings } from "@/lib/cms/warnings";
import { TEAM_ROLES, type TeamMember } from "@/lib/schema/v2";

import { PERSON_LINKS, useItemSchema } from "./forms";

const ROLE_LABELS: Record<string, string> = { organizer: "Organizer", volunteer: "Volunteer", alumni: "Alumni" };

function MemberForm({ formId, item, isNew, issues, onSubmit }: ItemFormProps<TeamMember>) {
  const form = useItemForm<TeamMember>(useItemSchema<TeamMember>({ photo: "name" }), item, isNew);
  const warnings = warningsByField(issues);
  const { editionYears, activeEdition } = useRegistry();
  const years = [...new Set([...editionYears, activeEdition, ...(item.editions ?? [])])].sort((a, b) => b - a);
  const { control } = form;
  return (
    <ItemFormShell form={form} formId={formId} item={item} onSubmit={onSubmit}>
      <TextInput control={control} name="name" label="Name" required autoFocus={isNew} warning={warnings.name} />
      <IdNote id={item.id} />
      <SegmentedInput
        control={control}
        name="role"
        label="Role"
        segments={TEAM_ROLES.map((value) => ({ value, label: ROLE_LABELS[value] }))}
      />
      <TextInput
        control={control}
        name="headline"
        label="Role and company"
        supportingText="For example: Senior SE @Google"
      />
      <MediaInput control={control} name="photo" label="Profile picture URL" required shape="circle" />
      <LinksInput control={control} name="links" keys={[...PERSON_LINKS]} />
      <ChoiceChipsInput
        control={control}
        name="editions"
        label="DevFests served"
        optional
        options={years.map((year) => ({ value: year, label: String(year) }))}
      />
      <SwitchInput
        control={control}
        name="active"
        label="Current team"
        supportingText="Turn off to keep someone in the alumni list only"
      />
    </ItemFormShell>
  );
}

export function TeamEditor({
  state,
  visibility,
}: {
  state: SectionState<{ items: TeamMember[] }>;
  visibility: Visibility;
}) {
  return (
    <ListSectionEditor<TeamMember>
      state={state}
      visibility={visibility}
      noun="member"
      fieldLabels={{
        name: "Name",
        role: "Role",
        headline: "Role and company",
        photo: "Profile picture",
        links: "Links",
      }}
      roundThumbnails
      warnings={(draft) => sectionWarnings(state.id, draft)}
      summarize={(member) => ({
        primary: member.name,
        secondary: [ROLE_LABELS[member.role] ?? member.role, member.headline].filter(Boolean).join(" · "),
        image: member.photo?.url,
        meta: member.active ? undefined : "Not current",
      })}
      createItem={() => ({ id: "", name: "", role: "volunteer", photo: { url: "", alt: "" }, active: true, order: 0 })}
      Form={MemberForm}
      filters={[
        { label: "Organizers", test: (member) => member.role === "organizer" },
        { label: "Volunteers", test: (member) => member.role === "volunteer" },
        { label: "Alumni", test: (member) => member.role === "alumni" || !member.active },
      ]}
    />
  );
}
