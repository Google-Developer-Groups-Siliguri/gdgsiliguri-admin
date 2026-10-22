"use client";

import { createContext, use } from "react";

import { ListSectionEditor } from "@/components/editor/ListSectionEditor";
import type { ItemFormProps } from "@/components/editor/ListEditor";
import type { SectionState } from "@/lib/content/repository";
import type { EventDetails, Speaker } from "@/lib/content/schemas";
import { isHttpsUrl } from "@/lib/url";

import { MEMBER_FIELD_LABELS, MemberForm } from "./MemberForm";

type Frames = EventDetails["frames"]["speakers"];

const FramesContext = createContext<Frames | null>(null);

function FramePreview({ speaker, frames }: { speaker: Speaker; frames: Frames }) {
  const track = speaker.designation as "AI" | "App" | "Cloud" | "Web";
  const trackFrame: string = frames[track] ?? "";
  const frame = trackFrame || frames.default;
  const photo = speaker.profilePictureURL.trim();
  return (
    <div className="flex items-center gap-4 rounded-md bg-surface-container p-3">
      <div className="relative size-28 shrink-0 overflow-hidden rounded-md bg-surface-container-highest">
        {isHttpsUrl(photo) && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photo} alt="" className="absolute inset-[12%] size-[76%] rounded-full object-cover" />
        )}
        {isHttpsUrl(frame) && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={frame} alt="" className="absolute inset-0 size-full object-contain" />
        )}
      </div>
      <div className="flex min-w-0 flex-col gap-1">
        <span className="text-title-small text-on-surface">Frame preview</span>
        <span className="text-body-small text-on-surface-variant">
          {trackFrame
            ? `Uses the ${track} frame from Event details.`
            : isHttpsUrl(frames.default)
              ? `No ${track || "track"} frame is set, so the default frame is used.`
              : `No frame is set for ${track || "this track"} in Event details.`}
        </span>
      </div>
    </div>
  );
}

function SpeakerForm(props: ItemFormProps<Speaker>) {
  const frames = use(FramesContext);
  return (
    <MemberForm
      {...(props as ItemFormProps<Speaker>)}
      kind="speaker"
      preview={frames ? (member) => <FramePreview speaker={member as Speaker} frames={frames} /> : undefined}
    />
  );
}

export function SpeakersEditor({ state, frames }: { state: SectionState<"speakers">; frames: Frames }) {
  return (
    <FramesContext value={frames}>
      <ListSectionEditor
      state={state}
      noun="speaker"
      fieldLabels={{ ...MEMBER_FIELD_LABELS, designation: "Track" }}
      roundThumbnails
      summarize={(speaker) => ({
        primary: speaker.name,
        secondary: [speaker.designation, speaker.description].filter(Boolean).join(" · "),
        image: speaker.profilePictureURL,
      })}
      createItem={() => ({
        name: "",
        designation: "AI",
        description: "",
        profilePictureURL: "",
        githubURL: "",
        linkedInURL: "",
        twitterURL: "",
      })}
      Form={SpeakerForm}
      filters={["AI", "App", "Cloud", "Web"].map((track) => ({
        label: track,
        test: (speaker: Speaker) => speaker.designation === track,
      }))}
      />
    </FramesContext>
  );
}
