"use client";

import { useCallback, useState } from "react";

import { MediaInput } from "@/components/editor/content-fields";
import { TextInput, UrlInput } from "@/components/editor/fields";
import { itemIssues } from "@/components/editor/issues";
import { ItemFormShell, useItemForm, warningsByField } from "@/components/editor/ItemForm";
import { ListEditor, type ItemFormProps } from "@/components/editor/ListEditor";
import { IdNote, ListSectionEditor, withOrder } from "@/components/editor/ListSectionEditor";
import { Tab, TabList, TabPanel, Tabs } from "@/components/m3/Tabs";
import type { Visibility } from "@/lib/cms/queries";
import type { SectionState } from "@/lib/cms/repository";
import { sectionWarnings } from "@/lib/cms/warnings";
import { LEGACY_SPONSOR_TIERS } from "@/lib/legacy/format";
import { SPONSOR_TIERS, type Sponsor, type SponsorTier } from "@/lib/schema/v2";

import { useItemSchema } from "./forms";

const TIER_LABELS: Record<SponsorTier, string> = {
  platinum: "Platinum",
  gold: "Gold",
  silver: "Silver",
  bronze: "Bronze",
  community: "Community",
  venue: "Venue",
  media: "Media",
};

const NEW_CLIENTS_ONLY = (tier: SponsorTier) => !(LEGACY_SPONSOR_TIERS as readonly string[]).includes(tier);

function SponsorForm({ formId, item, isNew, issues, onSubmit }: ItemFormProps<Sponsor>) {
  const form = useItemForm<Sponsor>(useItemSchema<Sponsor>({ logo: "name" }), item, isNew);
  const warnings = warningsByField(issues);
  const { control } = form;
  return (
    <ItemFormShell form={form} formId={formId} item={item} onSubmit={onSubmit}>
      <TextInput control={control} name="name" label="Sponsor name" required autoFocus={isNew} />
      <IdNote id={item.id} />
      <MediaInput
        control={control}
        name="logo"
        label="Logo URL"
        required
        shape="wide"
        altLabel="Logo description"
        warning={warnings["logo.url"]}
      />
      <UrlInput control={control} name="url" label="Website" warning={warnings.url} />
    </ItemFormShell>
  );
}

type TierListsProps = {
  items: Sponsor[];
  onChange: (items: Sponsor[]) => void;
  issues: (index: number) => ReturnType<typeof itemIssues>;
};

function TierLists({ items, onChange, issues }: TierListsProps) {
  const [tier, setTier] = useState<SponsorTier>("platinum");
  const inTier = (key: SponsorTier) => items.filter((sponsor) => sponsor.tier === key);
  const replaceTier = useCallback(
    (key: SponsorTier, next: Sponsor[]) => {
      const ordered = withOrder(next.map((sponsor) => ({ ...sponsor, tier: key })));
      onChange(
        SPONSOR_TIERS.flatMap((other) => (other === key ? ordered : items.filter((sponsor) => sponsor.tier === other))),
      );
    },
    [items, onChange],
  );
  const moveToTier = (sponsor: Sponsor, to: SponsorTier) => {
    const rest = items.filter((item) => item !== sponsor);
    const target = withOrder([...rest.filter((item) => item.tier === to), { ...sponsor, tier: to }]);
    onChange(SPONSOR_TIERS.flatMap((tier) => (tier === to ? target : rest.filter((item) => item.tier === tier))));
  };

  return (
    <Tabs value={tier} onValueChange={(value) => setTier(value as SponsorTier)}>
      <TabList aria-label="Sponsor tiers">
        {SPONSOR_TIERS.map((key) => (
          <Tab key={key} value={key}>
            {TIER_LABELS[key]} ({inTier(key).length})
          </Tab>
        ))}
      </TabList>
      {SPONSOR_TIERS.map((key) => (
        <TabPanel key={key} value={key} className="flex flex-col gap-3 pt-4">
          {NEW_CLIENTS_ONLY(key) && (
            <p className="inline-flex w-fit items-center rounded-full bg-tertiary-container px-3 py-1 text-label-medium text-on-tertiary-container">
              New app and website only. Older app versions don&apos;t show this tier.
            </p>
          )}
          <ListEditor<Sponsor>
            items={inTier(key)}
            onChange={(next) => replaceTier(key, next)}
            noun={`${TIER_LABELS[key].toLowerCase()} sponsor`}
            addLabel={`Add ${TIER_LABELS[key].toLowerCase()} sponsor`}
            summarize={(sponsor) => ({ primary: sponsor.name, secondary: sponsor.url, image: sponsor.logo?.url })}
            createItem={() => ({ id: "", name: "", tier: key, logo: { url: "", alt: "" }, order: 0 })}
            Form={SponsorForm}
            copyItem={(sponsor) => ({ ...structuredClone(sponsor), id: "" })}
            showFab={tier === key}
            issuesFor={(index) => issues(items.indexOf(inTier(key)[index]))}
            extraActions={(sponsor) =>
              SPONSOR_TIERS.filter((other) => other !== key).map((other) => ({
                label: `Move to ${TIER_LABELS[other]}`,
                icon: "swap_vert",
                onSelect: () => moveToTier(sponsor, other),
              }))
            }
          />
        </TabPanel>
      ))}
    </Tabs>
  );
}

export function SponsorsEditor({
  state,
  visibility,
}: {
  state: SectionState<{ items: Sponsor[] }>;
  visibility: Visibility;
}) {
  return (
    <ListSectionEditor<Sponsor>
      state={state}
      visibility={visibility}
      noun="sponsor"
      fieldLabels={{ name: "Name", logo: "Logo", url: "Website", tier: "Tier" }}
      keepOrder
      warnings={(draft) => sectionWarnings(state.id, draft)}
      summarize={(sponsor) => ({ primary: sponsor.name, secondary: TIER_LABELS[sponsor.tier] })}
      createItem={() => ({ id: "", name: "", tier: "platinum", logo: { url: "", alt: "" }, order: 0 })}
      Form={SponsorForm}
      aside={(editor) => (
        <TierLists
          items={editor.draft.items}
          onChange={(items) => editor.setDraft((current) => ({ ...current, items }))}
          issues={(index) => itemIssues(editor.errors, editor.warnings, ["items", index])}
        />
      )}
      wrapList={() => null}
    />
  );
}
