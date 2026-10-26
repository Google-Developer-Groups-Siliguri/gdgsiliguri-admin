"use client";

import { useMemo, useState, type ReactNode } from "react";
import { useWatch } from "react-hook-form";

import { EmbedUrlInput, InstantInput, MediaSlotInput, TagsInput } from "@/components/editor/content-fields";
import { FormSection } from "@/components/editor/FormSection";
import { TextInput, UrlInput } from "@/components/editor/fields";
import { fieldMessages, issuesUnder, itemIssues } from "@/components/editor/issues";
import { SectionEditorLayout } from "@/components/editor/SectionEditorLayout";
import { StringListEditor } from "@/components/editor/StringListEditor";
import { useDocForm } from "@/components/editor/useDocForm";
import { useSectionEditor, type SectionEditor } from "@/components/editor/useSectionEditor";
import { Switch } from "@/components/m3/Switch";
import { Tab, TabList, TabPanel, Tabs } from "@/components/m3/Tabs";
import { TextField } from "@/components/m3/TextField";
import type { SectionState } from "@/lib/cms/repository";
import { sectionWarnings } from "@/lib/cms/warnings";
import { EDITION_SECTION_KEYS, type Edition, type EditionSectionKey, type Media } from "@/lib/schema/v2";
import { formatEventMoment } from "@/lib/time";
import { toMillis } from "@/lib/time/tz";

import { MapPreview } from "./edition/MapPreview";
import { TracksEditor } from "./edition/TracksEditor";
import { docFormSchema } from "./forms";

const SECTION_LABELS: Record<EditionSectionKey, { label: string; hint: string }> = {
  schedule: { label: "Schedule", hint: "The session list" },
  speakers: { label: "Speakers", hint: "Speaker cards" },
  sponsors: { label: "Sponsors", hint: "Sponsor logos by tier" },
  partners: { label: "Community partners", hint: "Partner logos" },
  faqs: { label: "FAQ", hint: "DevFest questions" },
  perks: { label: "Perks", hint: "The perks list" },
  notes: { label: "Points to note", hint: "The points-to-note list" },
  registration: { label: "Registration", hint: "The ticket button and dates" },
};

const TAB_FOR_FIELD: Record<string, string> = {
  title: "basics",
  theme: "basics",
  summary: "basics",
  highlight: "basics",
  techStack: "basics",
  startAt: "when",
  endAt: "when",
  timeZone: "when",
  registration: "when",
  venue: "venue",
  banner: "branding",
  badges: "branding",
  speakerFrameDefault: "branding",
  tracks: "tracks",
  perks: "lists",
  notes: "lists",
  sections: "visibility",
  recap: "visibility",
};

const PATH_LABELS: Record<string, string> = {
  title: "Title",
  summary: "Summary",
  startAt: "Start",
  endAt: "End",
  registration: "Registration",
  venue: "Venue",
  banner: "Banner",
  tracks: "Tracks",
  perks: "Perks",
  notes: "Points to note",
  sections: "Sections",
};

function Toggle({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex min-h-14 cursor-pointer items-center justify-between gap-4 rounded-full bg-surface-container-high ps-5 pe-2.5">
      <span className="flex flex-col">
        <span className="text-label-large text-on-surface">{label}</span>
        <span className="text-label-medium text-on-surface-variant">{hint}</span>
      </span>
      <Switch checked={checked} onCheckedChange={onChange} aria-label={`Show ${label.toLowerCase()}`} />
    </label>
  );
}

function SummaryChip({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex h-7 items-center rounded-full bg-primary-container px-3 text-label-medium font-bold text-on-primary-container animate-pop-in">
      {children}
    </span>
  );
}

function BadgesEditor({ badges, onChange }: { badges: Media[]; onChange: (badges: Media[] | undefined) => void }) {
  return (
    <div className="flex flex-col gap-3">
      {badges.map((badge, index) => (
        <div key={index} className="flex items-center gap-2">
          <TextField
            label={`Badge ${index + 1} URL`}
            value={badge.url}
            onChange={(event) =>
              onChange(
                badges.map((entry, position) => (position === index ? { ...entry, url: event.target.value } : entry)),
              )
            }
          />
          <TextField
            label="Description"
            value={badge.alt}
            onChange={(event) =>
              onChange(
                badges.map((entry, position) => (position === index ? { ...entry, alt: event.target.value } : entry)),
              )
            }
          />
        </div>
      ))}
    </div>
  );
}

type EditionEditorProps = {
  state: SectionState<Edition>;
  usedTrackIds: Record<string, number>;
};

export function EditionEditor({ state, usedTrackIds }: EditionEditorProps) {
  const editor = useSectionEditor<Edition>(state, { warnings: (draft) => sectionWarnings(state.id, draft) });
  const { draft, setDraft, def } = editor;
  const schema = useMemo(() => docFormSchema<Edition>(def.schema.strict), [def]);
  const form = useDocForm<Edition>(schema, draft, setDraft);
  const { control } = form;
  const [tab, setTab] = useState("basics");
  const zone = useWatch({ control, name: "timeZone" }) || "Asia/Kolkata";
  const [startAt, embedUrl] = useWatch({ control, name: ["startAt", "venue.embedUrl"] }) as [
    string,
    string | undefined,
  ];
  const warnings = fieldMessages(editor.warnings);
  const publishedTracks = useMemo(
    () => new Set(((state.published.tracks as Edition["tracks"] | undefined) ?? []).map((track) => track.id)),
    [state.published.tracks],
  );

  function setList<K extends "perks" | "notes" | "techStack">(key: K, values: string[]) {
    setDraft((current) => ({ ...current, [key]: values.length ? values : undefined }));
  }

  function describePath(path: (string | number)[]) {
    const [first, second] = path;
    const base = PATH_LABELS[String(first)] ?? String(first);
    if (first === "tracks" && typeof second === "number")
      return `${base} · ${draft.tracks[second]?.label || `Track ${second + 1}`}`;
    return [base, typeof second === "string" ? second : typeof second === "number" ? `item ${second + 1}` : ""]
      .filter(Boolean)
      .join(" · ");
  }

  const listErrors = (key: string) =>
    Object.fromEntries(issuesUnder(editor.errors, [key]).map((issue) => [issue.path[0], issue.message]));

  return (
    <SectionEditorLayout
      editor={editor as unknown as SectionEditor}
      describePath={describePath}
      onSelectIssue={(path) => setTab(TAB_FOR_FIELD[String(path[0])] ?? "basics")}
    >
      <Tabs value={tab} onValueChange={setTab}>
        <TabList aria-label="Event">
          <Tab value="basics" icon="tune">
            Basics
          </Tab>
          <Tab value="when" icon="event">
            When
          </Tab>
          <Tab value="venue" icon="location_on">
            Venue
          </Tab>
          <Tab value="branding" icon="panorama">
            Branding
          </Tab>
          <Tab value="tracks" icon="category">
            Tracks
          </Tab>
          <Tab value="lists" icon="checklist">
            Perks and notes
          </Tab>
          <Tab value="visibility" icon="visibility">
            Sections
          </Tab>
        </TabList>

        <div className="mt-5">
          <TabPanel value="basics" forceMount hidden={tab !== "basics"} className="flex flex-col gap-4">
            <FormSection title="Basics" description="How this DevFest is named and described.">
              <TextInput control={control} name="title" label="Title" required />
              <TextInput
                control={control}
                name="theme"
                label="Theme"
                supportingText="Leave empty until the theme is decided"
              />
              <TextInput control={control} name="summary" label="Summary" required multiline rows={4} showCounter />
              <TextInput
                control={control}
                name="highlight"
                label="Archive highlight"
                supportingText="One line for the past DevFests list"
              />
              <TagsInput control={control} name="techStack" label="Tech stack" />
            </FormSection>
          </TabPanel>

          <TabPanel value="when" forceMount hidden={tab !== "when"} className="flex flex-col gap-4">
            <FormSection title="When" description={`All times are in ${zone}.`}>
              <InstantInput
                control={control}
                name="startAt"
                label="Starts"
                required
                timeZone={zone}
                defaultTime="08:00 AM"
                summary={startAt && <SummaryChip>{formatEventMoment(toMillis(startAt))}</SummaryChip>}
              />
              <InstantInput
                control={control}
                name="endAt"
                label="Ends"
                required
                timeZone={zone}
                defaultTime="05:30 PM"
              />
              <TextInput
                control={control}
                name="timeZone"
                label="Time zone"
                required
                supportingText="An IANA zone, for example Asia/Kolkata"
              />
            </FormSection>
            <FormSection title="Registration" description="Leave these empty while registration is pending.">
              <UrlInput
                control={control}
                name={"registration.url" as never}
                label="Registration link"
                leadingIcon="confirmation_number"
                warning={warnings["registration.url"]}
              />
              <InstantInput
                control={control}
                name={"registration.opensAt" as never}
                label="Opens"
                timeZone={zone}
                optional
              />
              <InstantInput
                control={control}
                name={"registration.closesAt" as never}
                label="Closes"
                timeZone={zone}
                defaultTime="11:59 PM"
                optional
              />
            </FormSection>
          </TabPanel>

          <TabPanel value="venue" forceMount hidden={tab !== "venue"} className="flex flex-col gap-4 expanded:flex-row">
            <FormSection title="Venue" description="Where DevFest happens." className="flex-1" stacked>
              <TextInput control={control} name={"venue.name" as never} label="Venue name" required />
              <TextInput control={control} name={"venue.address" as never} label="Address" />
              <UrlInput
                control={control}
                name={"venue.mapsUrl" as never}
                label="Google Maps link"
                leadingIcon="pin_drop"
                supportingText="Used by the Directions button"
              />
              <EmbedUrlInput
                control={control}
                name={"venue.embedUrl" as never}
                label="Map embed"
                supportingText="In Google Maps: Share → Embed a map. Pasting the whole iframe works too."
              />
            </FormSection>
            <div className="flex flex-col gap-3 expanded:w-100 expanded:shrink-0">
              <MediaSlotInput
                control={control}
                name={"venue.image" as never}
                label="Venue photo"
                aspect="4 / 3"
                fit="cover"
                optional
              />
              <MapPreview url={embedUrl ?? ""} />
            </div>
          </TabPanel>

          <TabPanel value="branding" forceMount hidden={tab !== "branding"} className="flex flex-col gap-4">
            <div className="grid grid-cols-1 gap-4 medium:grid-cols-2">
              <MediaSlotInput
                control={control}
                name="banner"
                label="Banner"
                size="2400 × 920"
                aspect="2.6"
                fit="cover"
                hint="Hero on the DevFest and home pages"
                className="medium:col-span-2"
              />
              <MediaSlotInput
                control={control}
                name={"banner.variants.long" as never}
                label="Long banner"
                size="3200 × 600"
                aspect="5.3"
                fit="cover"
                hint="Header strip"
                className="medium:col-span-2"
                optional
              />
              <MediaSlotInput
                control={control}
                name={"banner.variants.square" as never}
                label="Square banner"
                size="1080 × 1080"
                aspect="1"
                optional
              />
              <MediaSlotInput
                control={control}
                name="speakerFrameDefault"
                label="Default speaker frame"
                aspect="1"
                optional
              />
            </div>
            <FormSection title="Badges" description="Small logos shown with the banner, such as a partner summit.">
              <BadgesEditor
                badges={draft.badges ?? []}
                onChange={(badges) => setDraft((current) => ({ ...current, badges }))}
              />
            </FormSection>
          </TabPanel>

          <TabPanel value="tracks" forceMount hidden={tab !== "tracks"}>
            <FormSection
              title="Tracks"
              description="Each session and speaker can belong to a track. Tracks used by sessions or speakers can't be deleted."
            >
              <TracksEditor
                tracks={draft.tracks}
                onChange={(tracks) => setDraft((current) => ({ ...current, tracks }))}
                lockedIds={publishedTracks}
                usage={usedTrackIds}
                issuesFor={(index) => itemIssues(editor.errors, editor.warnings, ["tracks", index])}
              />
            </FormSection>
          </TabPanel>

          <TabPanel value="lists" forceMount hidden={tab !== "lists"} className="flex flex-col gap-4">
            <FormSection title="Perks" description="Shown when Perks is switched on.">
              <StringListEditor
                label="Perks"
                noun="Perk"
                values={draft.perks ?? []}
                errors={listErrors("perks")}
                onChange={(values) => setList("perks", values)}
              />
            </FormSection>
            <FormSection title="Points to note" description="Shown when Points to note is switched on.">
              <StringListEditor
                label="Points to note"
                noun="Point"
                values={draft.notes ?? []}
                errors={listErrors("notes")}
                onChange={(values) => setList("notes", values)}
              />
            </FormSection>
          </TabPanel>

          <TabPanel value="visibility" forceMount hidden={tab !== "visibility"} className="flex flex-col gap-4">
            <FormSection
              title="Sections"
              description="What the website and the app show for this DevFest. These change with the next publish."
            >
              {EDITION_SECTION_KEYS.map((key) => (
                <Toggle
                  key={key}
                  label={SECTION_LABELS[key].label}
                  hint={SECTION_LABELS[key].hint}
                  checked={Boolean(draft.sections[key])}
                  onChange={(value) =>
                    setDraft((current) => ({ ...current, sections: { ...current.sections, [key]: value } }))
                  }
                />
              ))}
            </FormSection>
            <FormSection title="Recap" description="For past editions: shown on the archive page.">
              <TextField
                label="Attendees"
                type="number"
                value={draft.recap?.attendees ?? ""}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    recap: { ...current.recap, attendees: event.target.value ? Number(event.target.value) : undefined },
                  }))
                }
              />
              <UrlInput
                control={control}
                name={"recap.photosUrl" as never}
                label="Photos link"
                leadingIcon="photo_library"
              />
              <UrlInput
                control={control}
                name={"recap.videoUrl" as never}
                label="Video link"
                leadingIcon="smart_display"
              />
            </FormSection>
          </TabPanel>
        </div>
      </Tabs>
    </SectionEditorLayout>
  );
}
