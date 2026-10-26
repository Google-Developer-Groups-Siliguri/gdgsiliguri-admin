"use client";

import { createContext, use, useState } from "react";
import { useFieldArray } from "react-hook-form";
import type { z } from "zod";

import { DateInput, ImageInput, TextInput, UrlInput } from "@/components/editor/fields";
import { ItemFormShell, useItemForm, warningsByField } from "@/components/editor/ItemForm";
import type { ItemFormProps } from "@/components/editor/ListEditor";
import { ListSectionEditor } from "@/components/editor/ListSectionEditor";
import { SortableList } from "@/components/editor/SortableList";
import { Button } from "@/components/m3/Button";
import { IconButton } from "@/components/m3/IconButton";
import type { SectionState } from "@/lib/content/repository";
import { strictSchemas, type CommunityEvent } from "@/lib/legacy/schemas";

const OtherIdsContext = createContext<(event: CommunityEvent) => string[]>(() => []);

const FIELD_LABELS: Record<string, string> = {
  id: "Id",
  name: "Name",
  tagline: "Tagline",
  description: "Description",
  thumbnail: "Thumbnail",
  coverImg: "Cover image",
  registrationDate: "Registration date",
  eventDate: "Event date",
  registrationLink: "Registration link",
  speakers: "Speakers",
};

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

function uniqueSlug(base: string, taken: string[]): string {
  if (!taken.includes(base)) return base;
  let suffix = 2;
  while (taken.includes(`${base}-${suffix}`)) suffix += 1;
  return `${base}-${suffix}`;
}

function SpeakersField({ form }: { form: ReturnType<typeof useItemForm<CommunityEvent>> }) {
  const { control } = form;
  const { fields, append, remove, move } = useFieldArray({ control, name: "speakers" as never });
  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="pb-2 text-title-medium text-on-surface">Speakers</legend>
      {fields.length === 0 && (
        <p className="text-body-medium text-on-surface-variant">No speakers yet.</p>
      )}
      <SortableList
        ariaLabel="Event speakers"
        items={fields}
        ids={fields.map((field) => field.id)}
        labelFor={(field, index) => form.getValues(`speakers.${index}.name`) || `Speaker ${index + 1}`}
        onReorder={move}
        className="gap-3"
        render={({ index, handle }) => (
          <div className="flex gap-2 rounded-md bg-surface-container p-3">
            <div>{handle}</div>
            <div className="flex min-w-0 flex-1 flex-col gap-3">
              <TextInput control={control} name={`speakers.${index}.name`} label="Name" required />
              <ImageInput control={control} name={`speakers.${index}.imageUrl`} label="Photo URL" shape="circle" />
              <TextInput control={control} name={`speakers.${index}.description`} label="About" multiline rows={2} />
            </div>
            <div>
              <IconButton icon="delete" label={`Remove speaker ${index + 1}`} onClick={() => remove(index)} />
            </div>
          </div>
        )}
      />
      <div>
        <Button variant="tonal" icon="person_add" onClick={() => append({ name: "", imageUrl: "", description: "" })}>
          Add speaker
        </Button>
      </div>
    </fieldset>
  );
}

function EventForm({ formId, item, isNew, issues, onSubmit }: ItemFormProps<CommunityEvent>) {
  const otherIds = use(OtherIdsContext)(item);
  const form = useItemForm<CommunityEvent>(
    strictSchemas.items.communityEvent as unknown as z.ZodType<CommunityEvent, CommunityEvent>,
    item,
    isNew,
  );
  const warnings = warningsByField(issues);
  const { control, setValue, getValues, setError } = form;
  const [idEdited, setIdEdited] = useState(!isNew);

  return (
    <ItemFormShell
      form={form}
      formId={formId}
      item={item}
      onSubmit={(event) => {
        if (otherIds.includes(event.id)) {
          setError("id", { message: "Another event already uses this id" });
          return;
        }
        onSubmit(event);
      }}
    >
      <div
        onChange={(event) => {
          const target = event.target as HTMLInputElement;
          if (target.name === "name" && !idEdited) {
            setValue("id", uniqueSlug(slugify(target.value), otherIds), { shouldValidate: true });
          }
          if (target.name === "id") setIdEdited(true);
        }}
        className="flex flex-col gap-4"
      >
        <TextInput control={control} name="name" label="Name" required autoFocus={isNew} warning={warnings.name} />
        <TextInput
          control={control}
          name="id"
          label="Id"
          required
          supportingText={`Used in links. Lowercase letters, numbers and hyphens.${getValues("id") ? "" : " Filled from the name."}`}
        />
      </div>
      <TextInput control={control} name="tagline" label="Tagline" />
      <TextInput control={control} name="description" label="Description" multiline rows={5} />
      <div className="grid grid-cols-1 gap-4 compact:grid-cols-2">
        <DateInput control={control} name="eventDate" label="Event date" />
        <DateInput control={control} name="registrationDate" label="Registration date" />
      </div>
      <UrlInput control={control} name="registrationLink" label="Registration link" warning={warnings.registrationLink} />
      <ImageInput control={control} name="thumbnail" label="Thumbnail URL" warning={warnings.thumbnail} />
      <ImageInput control={control} name="coverImg" label="Cover image URL" shape="wide" warning={warnings.coverImg} />
      <SpeakersField form={form} />
    </ItemFormShell>
  );
}

export function EventsEditor({ state }: { state: SectionState<"events"> }) {
  return (
    <ListSectionEditor
        state={state}
        noun="event"
        fieldLabels={FIELD_LABELS}
        wideDialog
        summarize={(event) => ({
          primary: event.name,
          secondary: [event.eventDate, event.tagline].filter(Boolean).join(" · "),
          image: event.thumbnail,
        })}
        createItem={() => ({
          id: "",
          name: "",
          tagline: "",
          description: "",
          thumbnail: "",
          coverImg: "",
          registrationDate: "",
          eventDate: "",
          registrationLink: "",
          speakers: [],
        })}
      Form={EventForm}
      wrapList={(items, list) => (
        <OtherIdsContext
          value={(event) => items.filter((other) => other !== event).map((other) => other.id)}
        >
          {list}
        </OtherIdsContext>
      )}
    />
  );
}
