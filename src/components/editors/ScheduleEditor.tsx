"use client";

import { createContext, use, useState } from "react";
import { Controller, useWatch, type Control } from "react-hook-form";

import {
  ClockInput,
  joinInstant,
  MarkdownInput,
  OptionalSelectInput,
  splitInstant,
} from "@/components/editor/content-fields";
import { SelectInput, TextInput, UrlInput } from "@/components/editor/fields";
import { ItemFormShell, useItemForm, warningsByField } from "@/components/editor/ItemForm";
import type { ItemFormProps } from "@/components/editor/ListEditor";
import { IdNote, ListSectionEditor } from "@/components/editor/ListSectionEditor";
import { FilterChip, InputChip } from "@/components/m3/Chip";
import { Dialog } from "@/components/m3/Dialog";
import { Icon } from "@/components/m3/Icon";
import { Select } from "@/components/m3/Select";
import { TextField } from "@/components/m3/TextField";
import type { Visibility } from "@/lib/cms/queries";
import type { SectionState } from "@/lib/cms/repository";
import { sectionWarnings } from "@/lib/cms/warnings";
import { sortSessions } from "@/lib/legacy/to-rtdb";
import { SESSION_LEVELS, SESSION_TYPES, type Edition, type Session, type Speaker } from "@/lib/schema/v2";
import { addDays, formatLegacyDate, formatLegacyTime, toMillis } from "@/lib/time/tz";

import { useItemSchema } from "./forms";

type ScheduleContext = { edition: Edition; speakers: Speaker[] };

const Context = createContext<ScheduleContext | null>(null);

const TYPE_LABELS: Record<string, string> = {
  keynote: "Keynote",
  talk: "Talk",
  workshop: "Workshop",
  panel: "Panel",
  lightning: "Lightning talk",
  break: "Break",
  registration: "Registration",
  networking: "Networking",
  other: "Other",
};

const MINUTE = 60_000;

function editionDays(edition: Edition): string[] {
  const zone = edition.timeZone;
  const first = formatLegacyDate(edition.startAt, zone);
  const last = formatLegacyDate(edition.endAt, zone);
  const days = [first];
  while (days.length < 7 && days.at(-1)! < last) days.push(addDays(days.at(-1)!, 1));
  return days;
}

function moveToDay(iso: string, day: string, zone: string): string {
  const { time } = splitInstant(iso, zone);
  return joinInstant(day, time || "09:00 AM", zone) ?? iso;
}

function SpeakersInput({ control, speakers }: { control: Control<Session>; speakers: Speaker[] }) {
  return (
    <Controller
      control={control}
      name="speakerIds"
      render={({ field, fieldState }) => {
        const selected = (field.value as string[] | undefined) ?? [];
        const byId = new Map(speakers.map((speaker) => [speaker.id, speaker]));
        const toggle = (id: string) =>
          field.onChange(selected.includes(id) ? selected.filter((entry) => entry !== id) : [...selected, id]);
        return (
          <fieldset className="flex flex-col gap-2">
            <legend className="px-1 pb-1 text-label-large text-on-surface">Speakers</legend>
            {selected.length > 0 && (
              <div className="flex flex-wrap gap-2" aria-label="Selected speakers">
                {selected.map((id) => (
                  <InputChip
                    key={id}
                    avatar={byId.get(id)?.photo?.url}
                    onRemove={() => toggle(id)}
                    removeLabel={`Remove ${byId.get(id)?.name ?? id}`}
                  >
                    {byId.get(id)?.name ?? id}
                  </InputChip>
                ))}
              </div>
            )}
            <div className="flex flex-wrap gap-2" role="group" aria-label="Choose speakers">
              {speakers
                .filter((speaker) => speaker.id)
                .map((speaker) => (
                  <FilterChip
                    key={speaker.id}
                    selected={selected.includes(speaker.id)}
                    onSelectedChange={() => toggle(speaker.id)}
                  >
                    {speaker.name}
                  </FilterChip>
                ))}
              {speakers.length === 0 && (
                <span className="px-1 text-body-small text-on-surface-variant">
                  Add speakers first, then pick them here.
                </span>
              )}
            </div>
            <p
              className={
                fieldState.error ? "px-1 text-body-small text-error" : "px-1 text-body-small text-on-surface-variant"
              }
            >
              {fieldState.error?.message ?? "Leave empty for breaks. The order you pick is the order shown."}
            </p>
          </fieldset>
        );
      }}
    />
  );
}

function SessionForm({ formId, item, isNew, issues, onSubmit }: ItemFormProps<Session>) {
  const { edition, speakers } = use(Context)!;
  const zone = edition.timeZone;
  const form = useItemForm<Session>(useItemSchema<Session>(), item, isNew);
  const warnings = warningsByField(issues);
  const { control, setValue, getValues } = form;
  const [startAt, endAt] = useWatch({ control, name: ["startAt", "endAt"] }) as [string, string];
  const days = editionDays(edition);
  const day = startAt ? formatLegacyDate(startAt, zone) : days[0];
  const minutes = startAt && endAt ? Math.round((toMillis(endAt) - toMillis(startAt)) / MINUTE) : null;

  return (
    <ItemFormShell form={form} formId={formId} item={item} onSubmit={onSubmit}>
      <TextInput control={control} name="title" label="Title" required autoFocus={isNew} warning={warnings.title} />
      <IdNote id={item.id} />
      <SelectInput
        control={control}
        name="type"
        label="Type"
        required
        options={SESSION_TYPES.map((value) => ({ value, label: TYPE_LABELS[value] }))}
      />
      {days.length > 1 && (
        <Select
          label="Day"
          value={day}
          options={days.map((value, index) => ({ value, label: `Day ${index + 1} · ${value}` }))}
          onValueChange={(next) => {
            setValue("startAt", moveToDay(getValues("startAt"), next, zone), {
              shouldDirty: true,
              shouldValidate: true,
            });
            setValue("endAt", moveToDay(getValues("endAt"), next, zone), { shouldDirty: true, shouldValidate: true });
          }}
        />
      )}
      <div className="grid grid-cols-1 gap-4 compact:grid-cols-2">
        <ClockInput
          control={control}
          name="startAt"
          label="Starts"
          required
          date={day}
          timeZone={zone}
          warning={warnings.startAt}
        />
        <ClockInput control={control} name="endAt" label="Ends" required date={day} timeZone={zone} />
      </div>
      <p className="-mt-2 flex items-center gap-2 px-4 text-body-medium text-on-surface-variant" aria-live="polite">
        <Icon name="timer" size={18} />
        {minutes && minutes > 0 ? `${minutes} minutes` : "Pick a start and an end time"}
      </p>
      <SpeakersInput control={control} speakers={speakers} />
      <OptionalSelectInput
        control={control}
        name="trackId"
        label="Track"
        noneLabel="No track"
        options={edition.tracks.map((track) => ({ value: track.id, label: track.label }))}
      />
      <TextInput control={control} name="room" label="Room" supportingText="Leave empty for the main hall" />
      <OptionalSelectInput
        control={control}
        name="level"
        label="Level"
        noneLabel="Any level"
        options={SESSION_LEVELS.map((value) => ({ value, label: value.charAt(0).toUpperCase() + value.slice(1) }))}
      />
      <MarkdownInput control={control} name="description" label="Description" rows={4} />
      <UrlInput control={control} name="slidesUrl" label="Slides" leadingIcon="slideshow" />
      <UrlInput control={control} name="videoUrl" label="Recording" leadingIcon="smart_display" />
    </ItemFormShell>
  );
}

function timeRange(session: Session, zone: string): string {
  if (!session.startAt || !session.endAt) return "No time yet";
  return `${formatLegacyTime(session.startAt, zone)} – ${formatLegacyTime(session.endAt, zone)}`;
}

function nextSession(sessions: Session[], edition: Edition): Session {
  const last = sortSessions(sessions.filter((session) => session.startAt && session.endAt)).at(-1);
  const startAt = last?.endAt ?? edition.startAt;
  return {
    id: "",
    title: "",
    type: "talk",
    startAt,
    endAt: new Date(toMillis(startAt) + 30 * MINUTE).toISOString(),
    speakerIds: [],
    order: 0,
  };
}

function shiftFrom(sessions: Session[], from: Session, minutes: number): Session[] {
  const pivot = toMillis(from.startAt);
  return sessions.map((session) =>
    session.startAt && toMillis(session.startAt) >= pivot
      ? {
          ...session,
          startAt: new Date(toMillis(session.startAt) + minutes * MINUTE).toISOString(),
          endAt: new Date(toMillis(session.endAt) + minutes * MINUTE).toISOString(),
        }
      : session,
  );
}

function sortForSchedule(sessions: Session[]): Session[] {
  const timed = sessions.filter((session) => session.startAt);
  const untimed = sessions.filter((session) => !session.startAt);
  return [...sortSessions(timed.map((session, index) => ({ ...session, order: (index + 1) * 10 }))), ...untimed];
}

type ScheduleEditorProps = {
  state: SectionState<{ items: Session[] }>;
  visibility: Visibility;
  edition: Edition;
  speakers: Speaker[];
};

export function ScheduleEditor({ state, visibility, edition, speakers }: ScheduleEditorProps) {
  const zone = edition.timeZone;
  const people = new Map(speakers.map((speaker) => [speaker.id, speaker]));
  const tracks = new Map(edition.tracks.map((track) => [track.id, track]));
  const [shift, setShift] = useState<{ session: Session; minutes: string } | null>(null);

  return (
    <Context value={{ edition, speakers }}>
      <ListSectionEditor<Session>
        state={state}
        visibility={visibility}
        noun="session"
        fieldLabels={{ title: "Title", startAt: "Time", endAt: "End", speakerIds: "Speakers", trackId: "Track" }}
        roundThumbnails
        wideDialog
        prepareItems={sortForSchedule}
        warnings={(draft) => sectionWarnings(state.id, draft, { edition, speakers })}
        summarize={(session) => {
          const names = session.speakerIds.map((id) => people.get(id)?.name ?? id);
          const track = session.trackId ? tracks.get(session.trackId) : undefined;
          return {
            primary: session.title,
            secondary: [timeRange(session, zone), names.join(", ") || TYPE_LABELS[session.type], session.room]
              .filter(Boolean)
              .join(" · "),
            image: people.get(session.speakerIds[0] ?? "")?.photo?.url,
            badge: track ? { label: track.label, color: track.color } : undefined,
          };
        }}
        createItem={(items) => nextSession(items, edition)}
        Form={SessionForm}
        aside={(editor) =>
          shift && (
            <Dialog
              open
              onOpenChange={(open) => !open && setShift(null)}
              title={`Shift "${shift.session.title}" and later sessions`}
              confirmLabel="Shift"
              confirmDisabled={!Number.isInteger(Number(shift.minutes)) || Number(shift.minutes) === 0}
              onConfirm={() => {
                editor.setDraft((current) => ({
                  ...current,
                  items: sortForSchedule(shiftFrom(current.items, shift.session, Number(shift.minutes))),
                }));
                setShift(null);
              }}
            >
              <TextField
                label="Minutes"
                type="number"
                value={shift.minutes}
                supportingText="Use a negative number to move them earlier"
                onChange={(event) => setShift({ ...shift, minutes: event.target.value })}
              />
            </Dialog>
          )
        }
        extraActions={(session) =>
          session.startAt
            ? [
                {
                  label: "Shift this and later…",
                  icon: "more_time",
                  onSelect: () => setShift({ session, minutes: "15" }),
                },
              ]
            : []
        }
        filters={[
          { label: "Talks", test: (session) => !["break", "registration", "networking"].includes(session.type) },
          { label: "Breaks", test: (session) => ["break", "registration", "networking"].includes(session.type) },
        ]}
      />
    </Context>
  );
}
