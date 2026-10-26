"use client";

import { createContext, use } from "react";
import type { z } from "zod";

import { ImageInput, TextInput, TimeInput } from "@/components/editor/fields";
import { ItemFormShell, useItemForm, warningsByField } from "@/components/editor/ItemForm";
import type { ItemFormProps } from "@/components/editor/ListEditor";
import { ListSectionEditor } from "@/components/editor/ListSectionEditor";
import { Icon } from "@/components/m3/Icon";
import { Select } from "@/components/m3/Select";
import type { SectionState } from "@/lib/content/repository";
import { strictSchemas, type ScheduleItem, type Speaker } from "@/lib/legacy/schemas";
import { durationInMins, time12ToMinutes } from "@/lib/datetime";

const SpeakersContext = createContext<Speaker[]>([]);

const slotFormSchema = strictSchemas.items.scheduleItem.omit({ durationInMins: true });

const FIELD_LABELS: Record<string, string> = {
  startTime: "Start",
  endTime: "End",
  durationInMins: "Duration",
  timeZone: "Time zone",
  title: "Title",
  subTitle: "Speaker",
  image: "Photo",
};

function SlotForm({ formId, item, isNew, issues, onSubmit }: ItemFormProps<ScheduleItem>) {
  const speakers = use(SpeakersContext);
  const form = useItemForm<ScheduleItem>(
    slotFormSchema as unknown as z.ZodType<ScheduleItem, ScheduleItem>,
    item,
    isNew,
  );
  const warnings = warningsByField(issues);
  const { control, watch, setValue } = form;
  const [startTime, endTime, subTitle] = watch(["startTime", "endTime", "subTitle"]) as [string, string, string];
  const duration = durationInMins(startTime, endTime);
  const start = time12ToMinutes(startTime);
  const end = time12ToMinutes(endTime);
  const endProblem = start !== null && end !== null && end <= start ? "Ends before it starts. Check AM/PM." : undefined;
  const matchingSpeaker = speakers.find((speaker) => speaker.name === subTitle);

  return (
    <ItemFormShell
      form={form}
      formId={formId}
      item={item}
      onSubmit={(slot) => onSubmit({ ...slot, durationInMins: duration ?? slot.durationInMins })}
    >
      <TextInput control={control} name="title" label="Title" required autoFocus={isNew} warning={warnings.title} />
      <div className="grid grid-cols-1 gap-4 compact:grid-cols-2">
        <TimeInput control={control} name="startTime" label="Starts" required warning={warnings.startTime} />
        <TimeInput control={control} name="endTime" label="Ends" required warning={endProblem ?? warnings.endTime} />
      </div>
      <p className="-mt-2 flex items-center gap-2 px-4 text-body-medium text-on-surface-variant" aria-live="polite">
        <Icon name="timer" size={18} />
        {duration ? `${duration} minutes` : "Duration is worked out from the start and end times"}
      </p>
      {speakers.length > 0 && (
        <Select
          label="Fill from a speaker"
          value={matchingSpeaker?.name}
          options={speakers.map((speaker) => ({ value: speaker.name, label: speaker.name }))}
          supportingText="Copies the speaker's name and photo"
          onValueChange={(name) => {
            const speaker = speakers.find((candidate) => candidate.name === name);
            if (!speaker) return;
            setValue("subTitle", speaker.name, { shouldDirty: true, shouldValidate: true });
            setValue("image", speaker.profilePictureURL, { shouldDirty: true, shouldValidate: true });
          }}
        />
      )}
      <TextInput
        control={control}
        name="subTitle"
        label="Speaker name"
        supportingText="Leave empty for breaks"
        warning={warnings.subTitle}
      />
      <ImageInput control={control} name="image" label="Speaker photo URL" shape="circle" warning={warnings.image} />
      <TextInput control={control} name="timeZone" label="Time zone" supportingText="Shown next to the time, for example IST" />
    </ItemFormShell>
  );
}

function nextSlot(items: ScheduleItem[]): ScheduleItem {
  const last = items[items.length - 1];
  return {
    startTime: last?.endTime ?? "09:00 AM",
    endTime: "",
    durationInMins: "",
    timeZone: last?.timeZone ?? "IST",
    title: "",
    subTitle: "",
    image: "",
  };
}

export function ScheduleEditor({ state, speakers }: { state: SectionState<"schedule">; speakers: Speaker[] }) {
  return (
    <SpeakersContext value={speakers}>
      <ListSectionEditor
        state={state}
        noun="slot"
        fieldLabels={FIELD_LABELS}
        roundThumbnails
        context={{ speakers }}
        summarize={(slot) => ({
          primary: slot.title,
          secondary: [`${slot.startTime} – ${slot.endTime}`, slot.subTitle].filter(Boolean).join(" · "),
          image: slot.image,
        })}
        createItem={nextSlot}
        Form={SlotForm}
      />
    </SpeakersContext>
  );
}
