"use client";

import { useCallback, useState } from "react";
import type { z } from "zod";

import { ImageInput, TextInput, UrlInput } from "@/components/editor/fields";
import { itemIssues } from "@/components/editor/issues";
import { ItemFormShell, useItemForm, warningsByField } from "@/components/editor/ItemForm";
import { ListEditor, type ItemFormProps } from "@/components/editor/ListEditor";
import { SectionEditorLayout } from "@/components/editor/SectionEditorLayout";
import { useSectionEditor } from "@/components/editor/useSectionEditor";
import { Tab, TabList, TabPanel, Tabs } from "@/components/m3/Tabs";
import type { SectionState } from "@/lib/content/repository";
import { SPONSOR_TIERS, strictSchemas, type Sponsor, type SponsorTier } from "@/lib/legacy/schemas";

const TIER_LABELS: Record<SponsorTier, string> = { platinum: "Platinum", gold: "Gold", silver: "Silver" };
const FIELD_LABELS: Record<string, string> = { sponsorName: "Name", icon: "Logo", socialMediaLink: "Link" };

function SponsorForm({ formId, item, isNew, issues, onSubmit }: ItemFormProps<Sponsor>) {
  const form = useItemForm<Sponsor>(strictSchemas.items.sponsor as unknown as z.ZodType<Sponsor, Sponsor>, item, isNew);
  const warnings = warningsByField(issues);
  const { control } = form;
  return (
    <ItemFormShell form={form} formId={formId} item={item} onSubmit={onSubmit}>
      <TextInput control={control} name="sponsorName" label="Sponsor name" required autoFocus={isNew} />
      <ImageInput control={control} name="icon" label="Logo URL" required shape="wide" warning={warnings.icon} />
      <UrlInput control={control} name="socialMediaLink" label="Website" warning={warnings.socialMediaLink} />
    </ItemFormShell>
  );
}

export function SponsorsEditor({ state }: { state: SectionState<"sponsors"> }) {
  const editor = useSectionEditor(state);
  const { setDraft } = editor;
  const [tier, setTier] = useState<SponsorTier>("platinum");
  const [openRequest, setOpenRequest] = useState<{ index: number; at: number } | null>(null);

  const setTierItems = useCallback(
    (target: SponsorTier, items: Sponsor[]) => setDraft((current) => ({ ...current, [target]: items })),
    [setDraft],
  );

  function moveToTier(from: SponsorTier, index: number, to: SponsorTier) {
    setDraft((current) => {
      const sponsor = current[from][index];
      return {
        ...current,
        [from]: current[from].filter((_, position) => position !== index),
        [to]: [...current[to], sponsor],
      };
    });
  }

  function describePath(path: (string | number)[]) {
    const [tierKey, index, field] = path;
    if (!SPONSOR_TIERS.includes(tierKey as SponsorTier) || typeof index !== "number") return "Sponsors";
    const sponsor = editor.draft[tierKey as SponsorTier][index];
    return [TIER_LABELS[tierKey as SponsorTier], sponsor?.sponsorName || `Sponsor ${index + 1}`, typeof field === "string" ? FIELD_LABELS[field] : ""]
      .filter(Boolean)
      .join(" · ");
  }

  return (
    <SectionEditorLayout
      editor={editor}
      describePath={describePath}
      onSelectIssue={(path) => {
        const [tierKey, index] = path;
        if (SPONSOR_TIERS.includes(tierKey as SponsorTier) && typeof index === "number") {
          setTier(tierKey as SponsorTier);
          setOpenRequest({ index, at: Date.now() });
        }
      }}
    >
      <Tabs value={tier} onValueChange={(value) => setTier(value as SponsorTier)}>
        <TabList aria-label="Sponsor tiers">
          {SPONSOR_TIERS.map((key) => (
            <Tab key={key} value={key}>
              {TIER_LABELS[key]} ({editor.draft[key].length})
            </Tab>
          ))}
        </TabList>
        {SPONSOR_TIERS.map((key) => (
          <TabPanel key={key} value={key} className="pt-4">
            {editor.draft[key].length === 0 && (
              <p className="pb-3 text-body-medium text-on-surface-variant">
                An empty tier is left off the website.
              </p>
            )}
            <ListEditor
              items={editor.draft[key]}
              onChange={(items) => setTierItems(key, items)}
              noun={`${TIER_LABELS[key].toLowerCase()} sponsor`}
              addLabel={`Add ${TIER_LABELS[key].toLowerCase()} sponsor`}
              summarize={(sponsor) => ({
                primary: sponsor.sponsorName,
                secondary: sponsor.socialMediaLink,
                image: sponsor.icon,
              })}
              createItem={() => ({ sponsorName: "", icon: "", socialMediaLink: "" })}
              Form={SponsorForm}
              openRequest={tier === key ? openRequest : null}
              issuesFor={(index) => itemIssues(editor.errors, editor.warnings, [key, index])}
              extraActions={(_, index) =>
                SPONSOR_TIERS.filter((other) => other !== key).map((other) => ({
                  label: `Move to ${TIER_LABELS[other]}`,
                  icon: "swap_vert",
                  onSelect: () => moveToTier(key, index, other),
                }))
              }
            />
          </TabPanel>
        ))}
      </Tabs>
    </SectionEditorLayout>
  );
}
