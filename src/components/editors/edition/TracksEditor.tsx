"use client";

import { createContext, use } from "react";
import { z } from "zod";

import { ColorInput, MediaInput } from "@/components/editor/content-fields";
import { TextInput } from "@/components/editor/fields";
import { ItemFormShell, useItemForm } from "@/components/editor/ItemForm";
import { ListEditor, type ItemFormProps } from "@/components/editor/ListEditor";
import { withOrder } from "@/components/editor/ListSectionEditor";
import { Icon } from "@/components/m3/Icon";
import type { ContentIssue } from "@/lib/cms/errors";
import { strict, type Track } from "@/lib/schema/v2";
import { stripEmpty } from "@/lib/schema/v2/clean";
import { slugify, uniqueSlug } from "@/lib/slug";

const trackSchema = z.preprocess((value) => {
  const track = stripEmpty(value) as Partial<Track>;
  return { ...track, id: track.id || slugify(track.label ?? "") || "track" };
}, strict.track) as unknown as z.ZodType<Track, Track>;

type TracksEditorProps = {
  tracks: Track[];
  onChange: (tracks: Track[]) => void;
  lockedIds: ReadonlySet<string>;
  usage: Record<string, number>;
  issuesFor: (index: number) => { errors: ContentIssue[]; warnings: ContentIssue[] };
};

const TracksContext = createContext<{ lockedIds: ReadonlySet<string>; taken: string[] }>({
  lockedIds: new Set(),
  taken: [],
});

function TrackForm({ formId, item, isNew, onSubmit }: ItemFormProps<Track>) {
  const { lockedIds, taken } = use(TracksContext);
  const form = useItemForm<Track>(trackSchema, item, isNew);
  const { control } = form;
  const locked = lockedIds.has(item.id);
  return (
    <ItemFormShell
      form={form}
      formId={formId}
      item={item}
      onSubmit={(track) =>
        onSubmit({ ...track, id: locked || item.id ? item.id || track.id : uniqueSlug(track.label, taken) })
      }
    >
      <TextInput
        control={control}
        name="label"
        label="Track name"
        required
        autoFocus={isNew}
        supportingText="For example AI, Cloud or Web"
      />
      {item.id && (
        <p className="flex items-center gap-1.5 px-1 text-body-small text-on-surface-variant">
          <Icon name={locked ? "lock" : "tag"} size={16} /> Id <code className="font-mono">{item.id}</code>
        </p>
      )}
      <ColorInput control={control} name="color" label="Colour" required />
      <MediaInput control={control} name="frame" label="Speaker frame URL" optional />
    </ItemFormShell>
  );
}

export function TracksEditor({ tracks, onChange, lockedIds, usage, issuesFor }: TracksEditorProps) {
  return (
    <TracksContext value={{ lockedIds, taken: tracks.map((track) => track.id) }}>
      <ListEditor<Track>
        items={tracks}
        onChange={(next) => onChange(withOrder(next))}
        noun="track"
        showFab={false}
        summarize={(track) => ({
          primary: track.label,
          secondary: usage[track.id] ? `Used by ${usage[track.id]} sessions or speakers` : "Not used yet",
          image: track.frame?.url,
          badge: { label: track.label || "Track", color: track.color },
        })}
        createItem={() => ({ id: "", label: "", color: "#4285F4", order: 0 })}
        copyItem={(track) => ({ ...structuredClone(track), id: "", label: `${track.label} copy` })}
        canDelete={(track) => (usage[track.id] ? `Used by ${usage[track.id]}` : null)}
        Form={TrackForm}
        issuesFor={issuesFor}
      />
    </TracksContext>
  );
}
