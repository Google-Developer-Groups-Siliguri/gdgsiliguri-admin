"use client";

import type { ReactNode } from "react";
import type { z } from "zod";

import {
  ImageInput,
  SegmentedInput,
  SelectInput,
  TextInput,
  UrlInput,
} from "@/components/editor/fields";
import { ItemFormShell, useItemForm, warningsByField } from "@/components/editor/ItemForm";
import type { ItemFormProps } from "@/components/editor/ListEditor";
import { SPEAKER_TRACKS, strictSchemas, TEAM_DESIGNATIONS, type Speaker, type TeamMember } from "@/lib/content/schemas";

type Member = TeamMember | Speaker;

type MemberFormProps = ItemFormProps<Member> & {
  kind: "team" | "speaker";
  preview?: (member: Member) => ReactNode;
};

export const MEMBER_FIELD_LABELS: Record<string, string> = {
  name: "Name",
  designation: "Designation",
  description: "Description",
  profilePictureURL: "Profile picture",
  githubURL: "GitHub",
  linkedInURL: "LinkedIn",
  twitterURL: "X / Twitter",
};

export function MemberForm({ formId, item, isNew, issues, onSubmit, kind, preview }: MemberFormProps) {
  const schema = (kind === "team" ? strictSchemas.items.teamMember : strictSchemas.items.speaker) as unknown as z.ZodType<Member, Member>;
  const form = useItemForm<Member>(schema, item, isNew);
  const warnings = warningsByField(issues);
  const { control } = form;
  const values = form.watch();

  return (
    <ItemFormShell form={form} formId={formId} item={item} onSubmit={onSubmit}>
      <TextInput control={control} name="name" label="Name" required autoFocus={isNew} warning={warnings.name} />
      {kind === "team" ? (
        <SegmentedInput
          control={control}
          name="designation"
          label="Designation"
          segments={TEAM_DESIGNATIONS.map((value) => ({ value, label: value }))}
        />
      ) : (
        <SelectInput
          control={control}
          name="designation"
          label="Track"
          required
          supportingText="Picks the speaker frame on the website"
          options={SPEAKER_TRACKS.map((value) => ({ value, label: value }))}
        />
      )}
      <TextInput
        control={control}
        name="description"
        label={kind === "team" ? "Role and company" : "Talk or role"}
        supportingText={kind === "team" ? "For example: Senior SE @Google" : undefined}
        warning={warnings.description}
      />
      {preview?.(values)}
      <ImageInput
        control={control}
        name="profilePictureURL"
        label="Profile picture URL"
        shape="circle"
        warning={warnings.profilePictureURL}
      />
      <UrlInput control={control} name="githubURL" label="GitHub" leadingIcon="code" warning={warnings.githubURL} />
      <UrlInput control={control} name="linkedInURL" label="LinkedIn" leadingIcon="work" warning={warnings.linkedInURL} />
      <UrlInput control={control} name="twitterURL" label="X / Twitter" leadingIcon="alternate_email" warning={warnings.twitterURL} />
    </ItemFormShell>
  );
}
