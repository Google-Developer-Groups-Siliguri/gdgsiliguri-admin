"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useForm, useWatch } from "react-hook-form";
import type { z } from "zod";

import { DateTimeInput } from "@/components/editor/DateTimeInput";
import { ImageInput, SwitchInput, TextInput, UrlInput } from "@/components/editor/fields";
import { fieldMessages, issuesUnder, itemIssues } from "@/components/editor/issues";
import { ItemFormShell, useItemForm, warningsByField } from "@/components/editor/ItemForm";
import { ListEditor, type ItemFormProps } from "@/components/editor/ListEditor";
import { SectionEditorLayout } from "@/components/editor/SectionEditorLayout";
import { StringListEditor } from "@/components/editor/StringListEditor";
import { useSectionEditor } from "@/components/editor/useSectionEditor";
import { Card } from "@/components/m3/Card";
import { Switch } from "@/components/m3/Switch";
import { Tab, TabList, TabPanel, Tabs } from "@/components/m3/Tabs";
import type { SectionState } from "@/lib/content/repository";
import { strictSchemas, type EventDetails, type SocialLink } from "@/lib/content/schemas";
import { deepEqual } from "@/lib/deep-equal";
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
  if (!url) return null;
  if (!embeddable) {
    return (
      <p className="px-4 text-body-small text-on-surface-variant">
        The preview appears for Google Maps embed links (Share → Embed a map → copy the src).
      </p>
    );
  }
  return (
    <iframe
      title="Venue map preview"
      src={url}
      className="h-64 w-full rounded-md border-0 bg-surface-container"
      loading="lazy"
      referrerPolicy="no-referrer-when-downgrade"
    />
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
    <div className="flex flex-col gap-4">
      <label className="flex min-h-14 cursor-pointer items-center gap-4">
        <span className="flex flex-1 flex-col">
          <span className="text-body-large text-on-surface">Show {title.toLowerCase()}</span>
          <span className="text-body-medium text-on-surface-variant">{description}</span>
        </span>
        <Switch checked={enabled} onCheckedChange={onEnabledChange} aria-label={`Show ${title.toLowerCase()}`} />
      </label>
      {children}
    </div>
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
          <Tab value="general">General</Tab>
          <Tab value="banners">Banners</Tab>
          <Tab value="venue">Venue</Tab>
          <Tab value="frames">Speaker frames</Tab>
          <Tab value="perks">Perks</Tab>
          <Tab value="points">Points to note</Tab>
          <Tab value="community">Community and social</Tab>
        </TabList>

        <Card variant="outlined" className="mt-4 p-4 medium:p-6">
          <TabPanel value="general" forceMount hidden={tab !== "general"} className="flex flex-col gap-5">
            <DateTimeInput control={control} name="eventDateTime" label="DevFest starts" />
            <DateTimeInput
              control={control}
              name="registrationExpiryDateTime"
              label="Registration closes"
              supportingText="After this the website shows registration as closed."
            />
            <UrlInput control={control} name="eventTicketURL" label="Ticket link" leadingIcon="confirmation_number" warning={warnings.eventTicketURL} />
            <TextInput control={control} name="bannerDescription" label="Banner description" multiline rows={4} />
            <TextInput control={control} name="communityDescription" label="Community description" multiline rows={5} />
            <SwitchInput control={control} name="eventMode" label="Event mode" supportingText="The eventMode flag the website reads" />
          </TabPanel>

          <TabPanel value="banners" forceMount hidden={tab !== "banners"} className="flex flex-col gap-5">
            <ImageInput control={control} name="bannerImages.large" label="Large banner" shape="wide" supportingText="Hero image on the DevFest and home pages" />
            <ImageInput control={control} name="bannerImages.long" label="Long banner" shape="wide" />
            <ImageInput control={control} name="bannerImages.medium" label="Medium banner" shape="wide" />
            <ImageInput control={control} name="bannerImages.small" label="Small banner" shape="wide" />
            <ImageInput control={control} name="bannerImages.aisummit" label="AI Summit banner (optional)" shape="wide" supportingText="Shown below the hero when set" />
          </TabPanel>

          <TabPanel value="venue" forceMount hidden={tab !== "venue"} className="flex flex-col gap-5">
            <TextInput control={control} name="eventVenue.name" label="Venue name" />
            <ImageInput control={control} name="eventVenue.imageURL" label="Venue photo URL" shape="wide" />
            <UrlInput control={control} name="eventVenue.mapsURL" label="Google Maps link" leadingIcon="map" supportingText="Opens in Google Maps" />
            <UrlInput control={control} name="eventVenue.mapsURLweb" label="Google Maps embed URL" leadingIcon="map" supportingText="The src of the embed iframe" />
            <MapPreview url={venueMap ?? ""} />
          </TabPanel>

          <TabPanel value="frames" forceMount hidden={tab !== "frames"} className="flex flex-col gap-5">
            <p className="text-body-medium text-on-surface-variant">Each speaker&apos;s track picks one of these frames.</p>
            {(["AI", "App", "Cloud", "Web", "default"] as const).map((track) => (
              <ImageInput key={track} control={control} name={`frames.speakers.${track}`} label={track === "default" ? "Default frame" : `${track} frame`} />
            ))}
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

          <TabPanel value="community" forceMount hidden={tab !== "community"} className="flex flex-col gap-5">
            <TextInput control={control} name="communityEmail" label="Community email" />
            <UrlInput control={control} name="communityJoinLink" label="Join the community link" warning={warnings.communityJoinLink} />
            <h3 className="pt-2 text-title-medium text-on-surface">Social links</h3>
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
          </TabPanel>
        </Card>
      </Tabs>
    </SectionEditorLayout>
  );
}
