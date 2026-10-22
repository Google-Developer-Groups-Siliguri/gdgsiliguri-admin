"use client";

import { ListSectionEditor } from "@/components/editor/ListSectionEditor";
import type { ItemFormProps } from "@/components/editor/ListEditor";
import type { SectionState } from "@/lib/content/repository";
import type { TeamMember } from "@/lib/content/schemas";

import { MEMBER_FIELD_LABELS, MemberForm } from "./MemberForm";

function TeamMemberForm(props: ItemFormProps<TeamMember>) {
  return <MemberForm {...(props as ItemFormProps<TeamMember>)} kind="team" />;
}

function summarize(member: TeamMember) {
  return {
    primary: member.name,
    secondary: [member.designation, member.description].filter(Boolean).join(" · "),
    image: member.profilePictureURL,
  };
}

export function TeamEditor({ state }: { state: SectionState<"teams"> }) {
  return (
    <ListSectionEditor
      state={state}
      noun="member"
      fieldLabels={MEMBER_FIELD_LABELS}
      summarize={summarize}
      roundThumbnails
      createItem={() => ({
        name: "",
        designation: "Volunteer",
        description: "",
        profilePictureURL: "",
        githubURL: "",
        linkedInURL: "",
        twitterURL: "",
      })}
      Form={TeamMemberForm}
      filters={[
        { label: "Organizers", test: (member) => member.designation === "Organizer" },
        { label: "Volunteers", test: (member) => member.designation === "Volunteer" },
      ]}
    />
  );
}
