"use client";

import { useState } from "react";
import { useFieldArray, type Control } from "react-hook-form";

import { InstantInput, MarkdownInput, MediaInput, TagsInput } from "@/components/editor/content-fields";
import { SwitchInput, TextInput, UrlInput } from "@/components/editor/fields";
import { FormSection } from "@/components/editor/FormSection";
import { ItemFormShell, useItemForm, warningsByField } from "@/components/editor/ItemForm";
import type { ItemFormProps } from "@/components/editor/ListEditor";
import { IdNote, ListSectionEditor } from "@/components/editor/ListSectionEditor";
import { Button } from "@/components/m3/Button";
import { IconButton } from "@/components/m3/IconButton";
import type { Visibility } from "@/lib/cms/queries";
import type { SectionState } from "@/lib/cms/repository";
import { sectionWarnings } from "@/lib/cms/warnings";
import type { CommunityEvent } from "@/lib/schema/v2";
import { DEFAULT_TIME_ZONE, formatLegacyDate, toMillis } from "@/lib/time/tz";

import { useItemSchema } from "./forms";

function EventSpeakers({ control }: { control: Control<CommunityEvent> }) {
  const { fields, append, remove } = useFieldArray({ control, name: "speakers" as never });
  return (
    <div className="flex flex-col gap-4">
      {fields.map((field, index) => (
        <div key={field.id} className="flex flex-col gap-3 rounded-md bg-surface-container-high p-3">
          <div className="flex items-start gap-2">
            <div className="flex-1">
              <TextInput control={control} name={`speakers.${index}.name` as never} label="Name" required />
            </div>
            <IconButton icon="delete" label={`Remove speaker ${index + 1}`} onClick={() => remove(index)} />
          </div>
          <TextInput control={control} name={`speakers.${index}.headline` as never} label="Headline" />
          <MediaInput
            control={control}
            name={`speakers.${index}.photo` as never}
            label="Photo URL"
            shape="circle"
            optional
          />
        </div>
      ))}
      <div>
        <Button variant="tonal" icon="add" onClick={() => append({ name: "" } as never)}>
          Add speaker
        </Button>
      </div>
    </div>
  );
}

function EventForm({ formId, item, isNew, issues, onSubmit }: ItemFormProps<CommunityEvent>) {
  const form = useItemForm<CommunityEvent>(useItemSchema<CommunityEvent>({ cover: "title" }), item, isNew);
  const warnings = warningsByField(issues);
  const { control } = form;
  const zone = item.timeZone || DEFAULT_TIME_ZONE;
  return (
    <ItemFormShell form={form} formId={formId} item={item} onSubmit={onSubmit}>
      <TextInput control={control} name="title" label="Title" required autoFocus={isNew} warning={warnings.title} />
      <IdNote id={item.id} />
      <TextInput control={control} name="tagline" label="Tagline" />
      <MarkdownInput control={control} name="description" label="Description" rows={4} />
      <InstantInput control={control} name="startAt" label="Starts" required timeZone={zone} defaultTime="10:00 AM" />
      <InstantInput control={control} name="endAt" label="Ends" timeZone={zone} defaultTime="02:00 PM" optional />
      <FormSection title="Where" stacked>
        <SwitchInput control={control} name="online" label="Online event" />
        <TextInput control={control} name={"venue.name" as never} label="Venue name" />
        <UrlInput control={control} name={"venue.mapsUrl" as never} label="Google Maps link" leadingIcon="pin_drop" />
      </FormSection>
      <FormSection title="Registration" stacked>
        <UrlInput
          control={control}
          name={"registration.url" as never}
          label="Registration link"
          leadingIcon="how_to_reg"
        />
        <InstantInput
          control={control}
          name={"registration.closesAt" as never}
          label="Registration closes"
          timeZone={zone}
          defaultTime="11:59 PM"
          optional
        />
      </FormSection>
      <MediaInput control={control} name="cover" label="Cover image URL" shape="wide" optional />
      <MediaInput control={control} name="thumbnail" label="Thumbnail URL" optional />
      <FormSection title="Speakers" stacked>
        <EventSpeakers control={control} />
      </FormSection>
      <TagsInput control={control} name="tags" label="Tags" />
    </ItemFormShell>
  );
}

export function EventsEditor({
  state,
  visibility,
}: {
  state: SectionState<{ items: CommunityEvent[] }>;
  visibility: Visibility;
}) {
  const [now] = useState(() => Date.now());
  const isUpcoming = (event: CommunityEvent) => Boolean(event.startAt) && toMillis(event.endAt || event.startAt) >= now;
  return (
    <ListSectionEditor<CommunityEvent>
      state={state}
      visibility={visibility}
      noun="event"
      fieldLabels={{ title: "Title", startAt: "Start", endAt: "End", registration: "Registration" }}
      wideDialog
      warnings={(draft) => sectionWarnings(state.id, draft)}
      summarize={(event) => ({
        primary: event.title,
        secondary: [
          event.startAt ? formatLegacyDate(event.startAt, event.timeZone || DEFAULT_TIME_ZONE) : "",
          event.tagline,
        ]
          .filter(Boolean)
          .join(" · "),
        image: event.thumbnail?.url ?? event.cover?.url,
      })}
      createItem={() => ({ id: "", title: "", startAt: "", timeZone: DEFAULT_TIME_ZONE })}
      Form={EventForm}
      keepOrder
      filters={[
        { label: "Upcoming", test: isUpcoming },
        { label: "Past", test: (event) => !isUpcoming(event) },
      ]}
    />
  );
}
