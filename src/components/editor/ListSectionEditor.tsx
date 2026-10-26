"use client";

import { createContext, use, useCallback, useMemo, useState, type ComponentType, type ReactNode } from "react";

import { Icon } from "@/components/m3/Icon";
import type { MenuItem } from "@/components/m3/Menu";
import { useSectionDef } from "@/components/registry/RegistryProvider";
import type { ContentIssue } from "@/lib/cms/errors";
import type { SectionDef } from "@/lib/sections/registry";
import type { Visibility } from "@/lib/cms/queries";
import type { SectionState } from "@/lib/cms/repository";

import { itemIssues } from "./issues";
import type { ItemSummary } from "./summary";
import { ListEditor, type ItemFormProps, type ListFilter } from "./ListEditor";
import { SectionEditorLayout } from "./SectionEditorLayout";
import { useSectionEditor, type SectionEditor } from "./useSectionEditor";

export type ListItem = Record<string, unknown> & { id: string; order?: number };
type ListDraft<T> = { items: T[] } & Record<string, unknown>;

const PublishedIdsContext = createContext<ReadonlySet<string>>(new Set());
const SectionIdContext = createContext<string | null>(null);

export function useEditingSection(): SectionDef {
  const id = use(SectionIdContext);
  if (!id) throw new Error("useEditingSection needs a ListSectionEditor");
  return useSectionDef(id);
}

export function usePublishedIds(): ReadonlySet<string> {
  return use(PublishedIdsContext);
}

export function IdNote({ id }: { id: string }) {
  const published = usePublishedIds();
  if (!id) {
    return <p className="px-1 text-body-small text-on-surface-variant">The id is made from the name when you save.</p>;
  }
  const locked = published.has(id);
  return (
    <p className="flex items-center gap-1.5 px-1 text-body-small text-on-surface-variant">
      <Icon name={locked ? "lock" : "tag"} size={16} />
      <span>
        Id <code className="font-mono">{id}</code>
        {locked ? " · locked because the app stores it" : ""}
      </span>
    </p>
  );
}

export function withOrder<T extends { order?: number }>(items: T[]): T[] {
  return items.map((item, index) => (item.order === (index + 1) * 10 ? item : { ...item, order: (index + 1) * 10 }));
}

export type ListSectionEditorProps<T extends ListItem> = {
  state: SectionState<ListDraft<T>>;
  visibility?: Visibility;
  noun: string;
  fieldLabels: Record<string, string>;
  summarize: (item: T) => ItemSummary;
  createItem: (items: T[]) => T;
  Form: ComponentType<ItemFormProps<T>>;
  filters?: ListFilter<T>[];
  roundThumbnails?: boolean;
  showThumbnails?: boolean;
  wideDialog?: boolean;
  warnings?: (draft: ListDraft<T>) => ContentIssue[];
  canDelete?: (item: T) => string | null;
  aside?: (editor: SectionEditor<ListDraft<T>>) => ReactNode;
  wrapList?: (items: T[], list: ReactNode) => ReactNode;
  keepOrder?: boolean;
  prepareItems?: (items: T[]) => T[];
  extraActions?: (item: T, index: number) => MenuItem[];
};

export function ListSectionEditor<T extends ListItem>({
  state,
  visibility,
  noun,
  fieldLabels,
  summarize,
  createItem,
  Form,
  filters,
  roundThumbnails,
  showThumbnails,
  wideDialog,
  warnings,
  canDelete,
  aside,
  wrapList,
  keepOrder = false,
  prepareItems = (next) => next,
  extraActions,
}: ListSectionEditorProps<T>) {
  const editor = useSectionEditor(state, { warnings, visibility });
  const [openRequest, setOpenRequest] = useState<{ index: number; at: number } | null>(null);
  const items = editor.draft.items;
  const publishedIds = useMemo(
    () => new Set(editor.state.published.items.map((item) => item.id).filter(Boolean)),
    [editor.state.published.items],
  );

  const { setDraft } = editor;
  const setItems = useCallback(
    (next: T[]) =>
      setDraft((current) => ({ ...current, items: keepOrder ? prepareItems(next) : withOrder(prepareItems(next)) })),
    [setDraft, keepOrder, prepareItems],
  );

  function describePath(path: (string | number)[]) {
    if (path[0] !== "items" || typeof path[1] !== "number") return editor.def.label;
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
      copyItem={(item) => ({ ...structuredClone(item), id: "" })}
      canDelete={canDelete}
      extraActions={extraActions}
      issuesFor={(index) => itemIssues(editor.errors, editor.warnings, ["items", index])}
    />
  );

  return (
    <SectionIdContext value={state.id}>
      <PublishedIdsContext value={publishedIds}>
        <SectionEditorLayout
          editor={editor as unknown as SectionEditor}
          describePath={describePath}
          onSelectIssue={(path) => {
            if (path[0] === "items" && typeof path[1] === "number") setOpenRequest({ index: path[1], at: Date.now() });
          }}
        >
          {aside?.(editor)}
          {wrapList ? wrapList(items, list) : list}
        </SectionEditorLayout>
      </PublishedIdsContext>
    </SectionIdContext>
  );
}
