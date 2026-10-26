"use client";

import { createContext, use } from "react";

import { ListSectionEditor } from "@/components/editor/ListSectionEditor";
import type { ItemFormProps } from "@/components/editor/ListEditor";
import type { SectionState } from "@/lib/content/repository";
import type { EventDetails, Speaker } from "@/lib/legacy/schemas";
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

const TRACK_COLORS: Record<string, string> = { AI: "#F8D8D8", App: "#FFE7A5", Cloud: "#C3ECF6", Web: "#CCF6C5" };
const TRACK_SHAPES: Record<string, string> = { AI: "arch", App: "cookie9", Cloud: "clover4", Web: "sunny" };

type SpeakersEditorProps = {
  state: SectionState<"speakers">;
  frames: Frames;
  slotTimes: Record<string, string>;
};

export function SpeakersEditor({ state, frames, slotTimes }: SpeakersEditorProps) {
  return (
    <FramesContext value={frames}>
      <ListSectionEditor
      state={state}
      noun="speaker"
      fieldLabels={{ ...MEMBER_FIELD_LABELS, designation: "Track" }}
      roundThumbnails
      summarize={(speaker) => ({
        primary: speaker.name,
        secondary: speaker.description,
        image: speaker.profilePictureURL,
        badge: TRACK_COLORS[speaker.designation]
          ? { label: speaker.designation, color: TRACK_COLORS[speaker.designation] }
          : undefined,
        shape: TRACK_SHAPES[speaker.designation],
        meta: slotTimes[speaker.name.trim()] ?? "",
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
        dot: TRACK_COLORS[track],
        test: (speaker: Speaker) => speaker.designation === track,
      }))}
      />
    </FramesContext>
  );
}
