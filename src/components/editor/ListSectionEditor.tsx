"use client";

import { useCallback, useState, type ComponentType, type ReactNode } from "react";

import type { SectionState } from "@/lib/content/repository";
import type { SectionValues } from "@/lib/legacy/schemas";
import type { SectionKey } from "@/lib/content/sections";
import type { ItemSummary } from "@/lib/content/summary";
import type { WarningContext } from "@/lib/content/warnings";

import { itemIssues } from "./issues";
import { ListEditor, type ItemFormProps, type ListFilter } from "./ListEditor";
import { SectionEditorLayout } from "./SectionEditorLayout";
import { useSectionEditor } from "./useSectionEditor";

type ListSectionKey = {
  [K in SectionKey]: SectionValues[K] extends { data: unknown[] } ? K : never;
}[SectionKey];

type ItemOf<K extends ListSectionKey> = SectionValues[K]["data"][number];

export type ListSectionEditorProps<K extends ListSectionKey> = {
  state: SectionState<K>;
  noun: string;
  fieldLabels: Record<string, string>;
  summarize: (item: ItemOf<K>) => ItemSummary;
  createItem: (items: ItemOf<K>[]) => ItemOf<K>;
  Form: ComponentType<ItemFormProps<ItemOf<K>>>;
  filters?: ListFilter<ItemOf<K>>[];
  roundThumbnails?: boolean;
  showThumbnails?: boolean;
  wideDialog?: boolean;
  context?: WarningContext;
  aside?: ReactNode;
  wrapList?: (items: ItemOf<K>[], list: ReactNode) => ReactNode;
};

export function ListSectionEditor<K extends ListSectionKey>({
  state,
  noun,
  fieldLabels,
  summarize,
  createItem,
  Form,
  filters,
  roundThumbnails,
  showThumbnails,
  wideDialog,
  context,
  aside,
  wrapList,
}: ListSectionEditorProps<K>) {
  const editor = useSectionEditor(state, context);
  const [openRequest, setOpenRequest] = useState<{ index: number; at: number } | null>(null);
  const items = editor.draft.data as ItemOf<K>[];

  const { setDraft } = editor;
  const setItems = useCallback(
    (next: ItemOf<K>[]) => setDraft((current) => ({ ...current, data: next }) as SectionValues[K]),
    [setDraft],
  );

  function describePath(path: (string | number)[]) {
    if (path[0] !== "data" || typeof path[1] !== "number") return "Section";
    const item = items[path[1]];
    const name = item ? summarize(item).primary : "";
    const field = typeof path[2] === "string" ? (fieldLabels[path[2]] ?? path[2]) : "";
    return [name || `${noun} ${path[1] + 1}`, field].filter(Boolean).join(" · ");
  }

  const list = (
    <ListEditor
      items={items}
      onChange={setItems}
      noun={noun}
      summarize={summarize}
      createItem={createItem}
      Form={Form}
      filters={filters}
      roundThumbnails={roundThumbnails}
      showThumbnails={showThumbnails}
      wideDialog={wideDialog}
      openRequest={openRequest}
      issuesFor={(index) => itemIssues(editor.errors, editor.warnings, ["data", index])}
    />
  );

  return (
    <SectionEditorLayout
      editor={editor}
      describePath={describePath}
      onSelectIssue={(path) => {
        if (path[0] === "data" && typeof path[1] === "number") {
          setOpenRequest({ index: path[1], at: Date.now() });
        }
      }}
    >
      {aside}
      {wrapList ? wrapList(items, list) : list}
    </SectionEditorLayout>
  );
}
