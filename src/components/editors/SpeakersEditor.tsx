"use client";

import { createContext, use } from "react";
import { useWatch } from "react-hook-form";

import { LinksInput, MarkdownInput, MediaInput, OptionalSelectInput } from "@/components/editor/content-fields";
import { TextInput } from "@/components/editor/fields";
import { ItemFormShell, useItemForm, warningsByField } from "@/components/editor/ItemForm";
import type { ItemFormProps } from "@/components/editor/ListEditor";
import { IdNote, ListSectionEditor } from "@/components/editor/ListSectionEditor";
import type { Visibility } from "@/lib/cms/queries";
import type { SectionState } from "@/lib/cms/repository";
import { sectionWarnings } from "@/lib/cms/warnings";
import type { Edition, Session, Speaker } from "@/lib/schema/v2";
import { isHttpsUrl } from "@/lib/url";

import { PERSON_LINKS, useItemSchema } from "./forms";

type SpeakerContext = { edition: Edition; sessions: Session[] };

const Context = createContext<SpeakerContext | null>(null);

function frameFor(edition: Edition, trackId: string | undefined): string {
  const track = edition.tracks.find((candidate) => candidate.id === trackId);
  return track?.frame?.url || edition.speakerFrameDefault?.url || "";
}

function FramePreview({ edition, speaker }: { edition: Edition; speaker: Speaker }) {
  const frame = frameFor(edition, speaker.trackId);
  const photo = speaker.photo?.url?.trim() ?? "";
  const track = edition.tracks.find((candidate) => candidate.id === speaker.trackId);
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
          {track?.frame?.url
            ? `Uses the ${track.label} frame from the event's tracks.`
            : frame
              ? "No frame for this track, so the default frame is used."
              : "No frame is set for this track."}
        </span>
      </div>
    </div>
  );
}

function SpeakerForm({ formId, item, isNew, issues, onSubmit }: ItemFormProps<Speaker>) {
  const context = use(Context)!;
  const form = useItemForm<Speaker>(useItemSchema<Speaker>({ photo: "name" }), item, isNew);
  const warnings = warningsByField(issues);
  const { control } = form;
  const values = useWatch({ control }) as Speaker;
  const talks = context.sessions.filter((session) => item.id && session.speakerIds.includes(item.id));
  return (
    <ItemFormShell form={form} formId={formId} item={item} onSubmit={onSubmit}>
      <TextInput control={control} name="name" label="Name" required autoFocus={isNew} warning={warnings.name} />
      <IdNote id={item.id} />
      <TextInput
        control={control}
        name="headline"
        label="Headline"
        supportingText="For example: Senior Engineer @Mercedes-Benz"
        warning={warnings.headline}
      />
      <TextInput control={control} name="company" label="Company" />
      <OptionalSelectInput
        control={control}
        name="trackId"
        label="Track"
        noneLabel="No track"
        options={context.edition.tracks.map((track) => ({ value: track.id, label: track.label }))}
        supportingText="Picks the speaker frame and colour"
      />
      <FramePreview edition={context.edition} speaker={values} />
      <MediaInput control={control} name="photo" label="Photo URL" required shape="circle" />
      <MarkdownInput control={control} name="bio" label="Bio" rows={4} />
      <LinksInput control={control} name="links" keys={[...PERSON_LINKS]} />
      {talks.length > 0 && (
        <p className="px-1 text-body-small text-on-surface-variant">
          Speaks in: {talks.map((session) => session.title).join(", ")}
        </p>
      )}
    </ItemFormShell>
  );
}

type SpeakersEditorProps = {
  state: SectionState<{ items: Speaker[] }>;
  visibility: Visibility;
  edition: Edition;
  sessions: Session[];
};

export function SpeakersEditor({ state, visibility, edition, sessions }: SpeakersEditorProps) {
  const tracks = new Map(edition.tracks.map((track) => [track.id, track]));
  const talkCount = (speaker: Speaker) =>
    sessions.filter((session) => speaker.id && session.speakerIds.includes(speaker.id)).length;
  return (
    <Context value={{ edition, sessions }}>
      <ListSectionEditor<Speaker>
        state={state}
        visibility={visibility}
        noun="speaker"
        fieldLabels={{ name: "Name", headline: "Headline", photo: "Photo", trackId: "Track", links: "Links" }}
        roundThumbnails
        warnings={(draft) => sectionWarnings(state.id, draft, { sessions })}
        canDelete={(speaker) => (talkCount(speaker) > 0 ? `In ${talkCount(speaker)} session(s)` : null)}
        summarize={(speaker) => {
          const track = speaker.trackId ? tracks.get(speaker.trackId) : undefined;
          const count = talkCount(speaker);
          return {
            primary: speaker.name,
            secondary: speaker.headline,
            image: speaker.photo?.url,
            badge: track ? { label: track.label, color: track.color } : undefined,
            meta: count ? `${count} session${count === 1 ? "" : "s"}` : "No session",
          };
        }}
        createItem={() => ({ id: "", name: "", photo: { url: "", alt: "" }, order: 0 })}
        Form={SpeakerForm}
        filters={edition.tracks.map((track) => ({
          label: track.label,
          dot: track.color,
          test: (speaker: Speaker) => speaker.trackId === track.id,
        }))}
      />
    </Context>
  );
}
