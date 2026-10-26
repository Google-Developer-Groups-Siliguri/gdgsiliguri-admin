"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Controller, useForm, useWatch, type Control } from "react-hook-form";
import type { z } from "zod";

import { DateTimeInput } from "@/components/editor/DateTimeInput";
import { ImageSlotInput } from "@/components/editor/ImageSlot";
import { FormSection } from "@/components/editor/FormSection";
import { ImageInput, TextInput, UrlInput } from "@/components/editor/fields";
import { fieldMessages, issuesUnder, itemIssues } from "@/components/editor/issues";
import { ItemFormShell, useItemForm, warningsByField } from "@/components/editor/ItemForm";
import { ListEditor, type ItemFormProps } from "@/components/editor/ListEditor";
import { SectionEditorLayout } from "@/components/editor/SectionEditorLayout";
import { StringListEditor } from "@/components/editor/StringListEditor";
import { useSectionEditor } from "@/components/editor/useSectionEditor";
import { Icon } from "@/components/m3/Icon";
import { Switch } from "@/components/m3/Switch";
import { Tab, TabList, TabPanel, Tabs } from "@/components/m3/Tabs";
import type { SectionState } from "@/lib/content/repository";
import { strictSchemas, type EventDetails, type SocialLink } from "@/lib/legacy/schemas";
import { dateTimeToEpoch } from "@/lib/datetime";
import { deepEqual } from "@/lib/deep-equal";
import { formatEventMoment, leadTime } from "@/lib/time";
import { isHttpsUrl } from "@/lib/url";

const FORM_FIELDS = [
  "bannerDescription",
  "communityDescription",
  "communityEmail",
  "communityJoinLink",
  "eventDateTime",
  "registrationExpiryDateTime",
  "eventMode",
  "eventTicketURL",
  "bannerImages",
  "eventVenue",
  "frames",
] as const;

type FormFields = Pick<EventDetails, (typeof FORM_FIELDS)[number]>;

const formSchema = strictSchemas.sections.eventDetails.pick(
  Object.fromEntries(FORM_FIELDS.map((field) => [field, true])) as Record<(typeof FORM_FIELDS)[number], true>,
) as unknown as z.ZodType<FormFields, FormFields>;

const TAB_FOR_FIELD: Record<string, string> = {
  bannerDescription: "general",
  communityDescription: "general",
  eventMode: "general",
  eventDateTime: "general",
  registrationExpiryDateTime: "general",
  eventTicketURL: "general",
  bannerImages: "banners",
  eventVenue: "venue",
  frames: "frames",
  perks: "perks",
  pointsToNote: "points",
  communityEmail: "community",
  communityJoinLink: "community",
  socialMediaLinks: "community",
};

const PATH_LABELS: Record<string, string> = {
  bannerDescription: "Banner description",
  communityDescription: "Community description",
  communityEmail: "Community email",
  communityJoinLink: "Join link",
  eventDateTime: "Event date and time",
  registrationExpiryDateTime: "Registration closes",
  eventTicketURL: "Ticket link",
  bannerImages: "Banners",
  eventVenue: "Venue",
  frames: "Speaker frames",
  perks: "Perks",
  pointsToNote: "Points to note",
  socialMediaLinks: "Social links",
};

function pickFormFields(details: EventDetails): FormFields {
  return Object.fromEntries(FORM_FIELDS.map((field) => [field, details[field]])) as FormFields;
}

function SocialLinkForm({ formId, item, isNew, issues, onSubmit }: ItemFormProps<SocialLink>) {
  const form = useItemForm<SocialLink>(strictSchemas.items.socialLink as unknown as z.ZodType<SocialLink, SocialLink>, item, isNew);
  const warnings = warningsByField(issues);
  return (
    <ItemFormShell form={form} formId={formId} item={item} onSubmit={onSubmit}>
      <TextInput control={form.control} name="name" label="Name" required autoFocus={isNew} supportingText="For example Twitter or Instagram" />
      <UrlInput control={form.control} name="url" label="Link" required warning={warnings.url} />
      <ImageInput control={form.control} name="image" label="Icon URL" warning={warnings.image} />
    </ItemFormShell>
  );
}

function MapPreview({ url }: { url: string }) {
  const embeddable = isHttpsUrl(url) && /google\.[a-z.]+\/maps\/embed/.test(url);
  if (embeddable) {
    return (
      <iframe
        title="Venue map preview"
        src={url}
        className="aspect-[4/3] w-full rounded-[28px] border-0 bg-surface-container"
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
      />
    );
  }
  return (
    <div className="flex aspect-[4/3] w-full flex-col items-center justify-center gap-2.5 rounded-[28px] bg-[repeating-linear-gradient(135deg,var(--md-sys-color-surface-container-high)_0_12px,var(--md-sys-color-surface-container)_12px_24px)] px-6 text-center text-on-surface-variant">
      <span className="shape-cookie6 grid size-11 place-items-center bg-primary text-on-primary">
        <Icon name="location_on" size={20} />
      </span>
      <span className="text-body-small">
        {url ? "The preview appears for Google Maps embed links." : "Add a map embed to see a live preview."}
      </span>
    </div>
  );
}

function ToggledList({
  title,
  description,
  enabled,
  onEnabledChange,
  children,
}: {
  title: string;
  description: string;
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
  children: ReactNode;
}) {
  return (
    <FormSection title={title} description={description}>
      <label className="flex h-14 cursor-pointer items-center justify-between gap-4 rounded-full bg-surface-container-high ps-5 pe-2.5">
        <span className="flex flex-col">
          <span className="text-label-large text-on-surface">Show {title.toLowerCase()}</span>
          <span className={enabled ? "text-label-medium text-primary" : "text-label-medium text-on-surface-variant"}>
            {enabled ? "Shown on the tickets page" : "Hidden from the website"}
          </span>
        </span>
        <Switch checked={enabled} onCheckedChange={onEnabledChange} aria-label={`Show ${title.toLowerCase()}`} />
      </label>
      {children}
    </FormSection>
  );
}

type SummaryTone = "primary" | "neutral" | "error";

const SUMMARY_TONES: Record<SummaryTone, string> = {
  primary: "bg-primary-container text-on-primary-container",
  neutral: "bg-surface-container-highest text-on-surface",
  error: "bg-error-container text-on-error-container",
};

function SummaryChip({ tone, children }: { tone: SummaryTone; children: ReactNode }) {
  return (
    <span className={`inline-flex h-7 items-center rounded-full px-3 text-label-medium font-bold animate-pop-in ${SUMMARY_TONES[tone]}`}>
      {children}
    </span>
  );
}

function EventModeCard({ control }: { control: Control<FormFields> }) {
  return (
    <Controller
      control={control}
      name="eventMode"
      render={({ field }) => {
        const on = Boolean(field.value);
        return (
          <label
            className={`flex cursor-pointer items-center gap-5 rounded-[28px] px-7 py-5.5 transition-colors duration-500 ${
              on ? "bg-primary-container text-on-primary-container" : "bg-surface-container text-on-surface"
            }`}
          >
            <span
              className={`shape-sunny size-12 shrink-0 transition-[background-color,rotate] duration-700 ease-spring ${
                on ? "rotate-45 bg-primary" : "bg-surface-container-highest"
              }`}
              aria-hidden
            />
            <span className="flex flex-1 flex-col gap-0.5">
              <span className="font-display text-[18px] font-extrabold">Event mode</span>
              <span className="text-body-small opacity-80">
                {on ? "The website shows the DevFest event experience." : "The website shows the regular community pages."}
              </span>
            </span>
            <Switch checked={on} onCheckedChange={field.onChange} aria-label="Event mode" />
          </label>
        );
      }}
    />
  );
}

export function EventDetailsEditor({ state }: { state: SectionState<"eventDetails"> }) {
  const editor = useSectionEditor(state);
  const { draft, setDraft } = editor;
  const [tab, setTab] = useState("general");
  const form = useForm<FormFields>({
    resolver: zodResolver(formSchema),
    defaultValues: pickFormFields(draft),
    mode: "onChange",
  });
  const { control, reset, trigger } = form;
  const watched = useWatch({ control }) as FormFields;
  const lastSynced = useRef<FormFields>(pickFormFields(draft));
  const venueMap = useWatch({ control, name: "eventVenue.mapsURLweb" });
  const eventAt = dateTimeToEpoch(watched.eventDateTime ?? "");
  const closesAt = dateTimeToEpoch(watched.registrationExpiryDateTime ?? "");

  useEffect(() => {
    void trigger();
  }, [trigger]);

  useEffect(() => {
    const fromDraft = pickFormFields(draft);
    if (!deepEqual(fromDraft, lastSynced.current)) {
      lastSynced.current = fromDraft;
      reset(fromDraft);
    }
  }, [draft, reset]);

  useEffect(() => {
    const values = { ...lastSynced.current, ...watched } as FormFields;
    if (deepEqual(values, lastSynced.current)) return;
    lastSynced.current = values;
    setDraft((current) => ({ ...current, ...values }));
  }, [watched, setDraft]);

  const warnings = fieldMessages(editor.warnings);

  function describePath(path: (string | number)[]) {
    const [first, second, third] = path;
    const base = PATH_LABELS[String(first)] ?? String(first);
    if (first === "socialMediaLinks" && typeof second === "number") {
      return `${base} · ${draft.socialMediaLinks[second]?.name || `Link ${second + 1}`}${third ? ` · ${third}` : ""}`;
    }
    if (typeof second === "number") return `${base} · item ${second + 1}`;
    return [base, second].filter(Boolean).join(" · ");
  }

  const perkErrors = Object.fromEntries(
    issuesUnder(editor.errors, ["perks", "data"]).map((issue) => [issue.path[0], issue.message]),
  );
  const pointErrors = Object.fromEntries(
    issuesUnder(editor.errors, ["pointsToNote", "data"]).map((issue) => [issue.path[0], issue.message]),
  );

  return (
    <SectionEditorLayout
      editor={editor}
      describePath={describePath}
      onSelectIssue={(path) => setTab(TAB_FOR_FIELD[String(path[0])] ?? "general")}
    >
      <Tabs value={tab} onValueChange={setTab}>
        <TabList aria-label="Event details">
          <Tab value="general" icon="tune">General</Tab>
          <Tab value="banners" icon="panorama">Banners</Tab>
          <Tab value="venue" icon="location_on">Venue</Tab>
          <Tab value="frames" icon="filter_frames">Speaker frames</Tab>
          <Tab value="perks" icon="redeem">Perks</Tab>
          <Tab value="points" icon="checklist">Points to note</Tab>
          <Tab value="community" icon="share">Community and social</Tab>
        </TabList>

        <div className="mt-5">
          <TabPanel value="general" forceMount hidden={tab !== "general"} className="flex flex-col gap-4">
            <FormSection title="Schedule" description="When the event begins and when ticket sales stop. All times are IST.">
              <DateTimeInput
                control={control}
                name="eventDateTime"
                label="DevFest starts"
                summary={eventAt !== null && <SummaryChip tone="primary">{formatEventMoment(eventAt)}</SummaryChip>}
              />
              <DateTimeInput
                control={control}
                name="registrationExpiryDateTime"
                label="Registration closes"
                supportingText="After this the website shows registration as closed."
                summary={
                  eventAt !== null &&
                  closesAt !== null && (
                    <SummaryChip tone={closesAt > eventAt ? "error" : "neutral"}>{leadTime(eventAt, closesAt)}</SummaryChip>
                  )
                }
              />
            </FormSection>
            <FormSection title="Tickets" description="Where the “Get your ticket” button sends people.">
              <UrlInput control={control} name="eventTicketURL" label="Ticket link" leadingIcon="confirmation_number" warning={warnings.eventTicketURL} />
            </FormSection>
            <FormSection title="Descriptions" description="Copy shown on the DevFest banner and in the community section.">
              <TextInput control={control} name="bannerDescription" label="Banner description" multiline rows={4} showCounter />
              <TextInput control={control} name="communityDescription" label="Community description" multiline rows={4} showCounter />
            </FormSection>
            <EventModeCard control={control} />
          </TabPanel>

          <TabPanel value="banners" forceMount hidden={tab !== "banners"} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5 px-1">
              <h2 className="font-display text-[20px] font-extrabold text-on-surface">Banners</h2>
              <p className="text-body-small text-on-surface-variant">
                Drop an image on a slot, browse, or paste a link. Each slot shows its recommended size.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-4 medium:grid-cols-2">
              <ImageSlotInput
                control={control}
                name="bannerImages.large"
                label="Large banner"
                size="2400 × 920"
                aspect="2.6"
                fit="cover"
                hint="Hero on the DevFest and home pages"
                className="medium:col-span-2"
              />
              <ImageSlotInput
                control={control}
                name="bannerImages.long"
                label="Long banner"
                size="3200 × 600"
                aspect="5.3"
                fit="cover"
                hint="Header strip"
                className="medium:col-span-2"
              />
              <ImageSlotInput control={control} name="bannerImages.medium" label="Medium banner" size="1600 × 900" aspect="16 / 9" fit="cover" />
              <ImageSlotInput control={control} name="bannerImages.small" label="Small banner" size="1080 × 1080" aspect="16 / 9" fit="contain" />
              <ImageSlotInput
                control={control}
                name="bannerImages.aisummit"
                label="AI Summit banner"
                size="1200 × 400"
                aspect="3"
                hint="Optional · shown below the hero when set"
                className="medium:col-span-2"
              />
            </div>
          </TabPanel>

          <TabPanel value="venue" forceMount hidden={tab !== "venue"} className="flex flex-col gap-4 expanded:flex-row">
            <FormSection title="Venue" description="Where DevFest happens." className="flex-1" stacked>
              <TextInput control={control} name="eventVenue.name" label="Venue name" />
              <UrlInput control={control} name="eventVenue.mapsURL" label="Google Maps link" leadingIcon="pin_drop" supportingText="Used by the “Directions” button." />
              <UrlInput
                control={control}
                name="eventVenue.mapsURLweb"
                label="Map embed"
                leadingIcon="map"
                supportingText="In Google Maps: Share → Embed a map → copy the src value."
              />
            </FormSection>
            <div className="flex flex-col gap-3 expanded:w-100 expanded:shrink-0">
              <ImageSlotInput control={control} name="eventVenue.imageURL" label="Venue photo" aspect="4 / 3" fit="cover" />
              <MapPreview url={venueMap ?? ""} />
            </div>
          </TabPanel>

          <TabPanel value="frames" forceMount hidden={tab !== "frames"}>
            <FormSection title="Speaker frames" description="Each speaker’s track picks one of these frames.">
              <div className="grid grid-cols-1 gap-4 compact:grid-cols-2 expanded:grid-cols-3">
                {(["AI", "App", "Cloud", "Web", "default"] as const).map((track) => (
                  <ImageSlotInput
                    key={track}
                    control={control}
                    name={`frames.speakers.${track}`}
                    label={track === "default" ? "Default frame" : `${track} frame`}
                    aspect="1"
                  />
                ))}
              </div>
            </FormSection>
          </TabPanel>

          <TabPanel value="perks" forceMount hidden={tab !== "perks"}>
            <ToggledList
              title="Perks"
              description="The perks list on the tickets page"
              enabled={draft.perks.enabled}
              onEnabledChange={(enabled) => setDraft((current) => ({ ...current, perks: { ...current.perks, enabled } }))}
            >
              <StringListEditor
                label="Perks"
                noun="Perk"
                values={draft.perks.data}
                errors={perkErrors}
                onChange={(data) => setDraft((current) => ({ ...current, perks: { ...current.perks, data } }))}
              />
            </ToggledList>
          </TabPanel>

          <TabPanel value="points" forceMount hidden={tab !== "points"}>
            <ToggledList
              title="Points to note"
              description="The points-to-note list on the tickets page"
              enabled={draft.pointsToNote.enabled}
              onEnabledChange={(enabled) =>
                setDraft((current) => ({ ...current, pointsToNote: { ...current.pointsToNote, enabled } }))
              }
            >
              <StringListEditor
                label="Points to note"
                noun="Point"
                values={draft.pointsToNote.data}
                errors={pointErrors}
                onChange={(data) =>
                  setDraft((current) => ({ ...current, pointsToNote: { ...current.pointsToNote, data } }))
                }
              />
            </ToggledList>
          </TabPanel>

          <TabPanel value="community" forceMount hidden={tab !== "community"} className="flex flex-col gap-4">
            <FormSection title="Community" description="How people reach and join GDG Siliguri.">
              <TextInput control={control} name="communityEmail" label="Community email" />
              <UrlInput control={control} name="communityJoinLink" label="Join the community link" warning={warnings.communityJoinLink} />
            </FormSection>
            <FormSection title="Social links" description="The icons in the website footer.">
              <ListEditor
                items={draft.socialMediaLinks}
                onChange={(socialMediaLinks) => setDraft((current) => ({ ...current, socialMediaLinks }))}
                noun="social link"
                summarize={(link) => ({ primary: link.name, secondary: link.url, image: link.image })}
                createItem={() => ({ name: "", url: "", image: "" })}
                Form={SocialLinkForm}
                showFab={false}
                issuesFor={(index) => itemIssues(editor.errors, editor.warnings, ["socialMediaLinks", index])}
              />
            </FormSection>
          </TabPanel>
        </div>
      </Tabs>
    </SectionEditorLayout>
  );
}
