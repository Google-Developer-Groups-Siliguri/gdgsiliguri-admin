"use client";

import { useId, useMemo, useState, type ComponentType, type ReactNode } from "react";

import { Button } from "@/components/m3/Button";
import { Card } from "@/components/m3/Card";
import { FilterChip } from "@/components/m3/Chip";
import { ConfirmDialog, Dialog } from "@/components/m3/Dialog";
import { Fab } from "@/components/m3/Fab";
import { Icon } from "@/components/m3/Icon";
import { IconButton } from "@/components/m3/IconButton";
import { Menu, type MenuItem } from "@/components/m3/Menu";
import { TextField } from "@/components/m3/TextField";
import { Tooltip } from "@/components/m3/Tooltip";
import { ItemThumbnail } from "@/components/section/ItemThumbnail";
import type { ItemSummary } from "@/lib/content/summary";
import { cn } from "@/lib/cn";

import type { ItemIssues } from "./issues";
import { arrayMove, rowId, SortableList } from "./SortableList";

export type ItemFormProps<T> = {
  formId: string;
  item: T;
  isNew: boolean;
  issues: ItemIssues;
  onSubmit: (item: T) => void;
};

export type ListFilter<T> = { label: string; test: (item: T) => boolean };

export type ListEditorProps<T extends object> = {
  items: T[];
  onChange: (items: T[]) => void;
  noun: string;
  summarize: (item: T) => ItemSummary;
  createItem: (items: T[]) => T;
  Form: ComponentType<ItemFormProps<T>>;
  issuesFor?: (index: number) => ItemIssues;
  filters?: ListFilter<T>[];
  extraActions?: (item: T, index: number) => MenuItem[];
  roundThumbnails?: boolean;
  showThumbnails?: boolean;
  emptyMessage?: string;
  wideDialog?: boolean;
  showFab?: boolean;
  headerSlot?: ReactNode;
  addLabel?: string;
  openRequest?: { index: number; at: number } | null;
};

const NO_ISSUES: ItemIssues = { errors: [], warnings: [] };

type Editing<T> = { index: number | null; item: T } | null;

export function ListEditor<T extends object>({
  items,
  onChange,
  noun,
  summarize,
  createItem,
  Form,
  issuesFor,
  filters,
  extraActions,
  roundThumbnails = false,
  showThumbnails = true,
  emptyMessage,
  wideDialog = false,
  showFab = true,
  headerSlot,
  addLabel,
  openRequest,
}: ListEditorProps<T>) {
  const formId = useId();
  const [query, setQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [editing, setEditing] = useState<Editing<T>>(null);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [handledRequest, setHandledRequest] = useState(openRequest?.at ?? 0);
  if (openRequest && openRequest.at !== handledRequest) {
    setHandledRequest(openRequest.at);
    if (items[openRequest.index]) setEditing({ index: openRequest.index, item: items[openRequest.index] });
  }
  const ids = items.map(rowId);
  const summaries = useMemo(() => items.map(summarize), [items, summarize]);

  const filter = filters?.find((candidate) => candidate.label === activeFilter);
  const normalizedQuery = query.trim().toLowerCase();
  const narrowed = Boolean(normalizedQuery || filter);
  const visible = (item: T, index: number) => {
    if (filter && !filter.test(item)) return false;
    if (!normalizedQuery) return true;
    const summary = summaries[index];
    return `${summary.primary} ${summary.secondary ?? ""}`.toLowerCase().includes(normalizedQuery);
  };
  const visibleCount = items.filter(visible).length;

  function move(from: number, to: number) {
    if (to < 0 || to >= items.length) return;
    onChange(arrayMove(items, from, to));
  }

  function duplicate(index: number) {
    const copy = structuredClone(items[index]);
    onChange([...items.slice(0, index + 1), copy, ...items.slice(index + 1)]);
  }

  function remove(index: number) {
    onChange(items.filter((_, position) => position !== index));
  }

  function submit(item: T) {
    if (!editing) return;
    if (editing.index === null) onChange([...items, item]);
    else onChange(items.map((current, position) => (position === editing.index ? item : current)));
    setEditing(null);
  }

  function label(index: number) {
    return summaries[index]?.primary || `${noun} ${index + 1}`;
  }

  function addNew() {
    setEditing({ index: null, item: createItem(items) });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-3 compact:flex-row compact:items-center">
        <TextField
          label={`Search ${items.length} ${items.length === 1 ? noun : `${noun}s`}`}
          leadingIcon="search"
          variant="pill"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          containerClassName="compact:max-w-sm"
          trailing={
            query ? <IconButton icon="close" label="Clear search" onClick={() => setQuery("")} /> : undefined
          }
        />
        {filters && (
          <div className="flex flex-wrap gap-2" role="group" aria-label="Filter">
            {filters.map((candidate) => (
              <FilterChip
                key={candidate.label}
                selected={activeFilter === candidate.label}
                onSelectedChange={(selected) => setActiveFilter(selected ? candidate.label : null)}
              >
                {candidate.label}
              </FilterChip>
            ))}
          </div>
        )}
        {headerSlot}
      </div>
      {narrowed && (
        <p className="text-body-small text-on-surface-variant">
          Showing {visibleCount} of {items.length}. Clear the search and filters to reorder.
        </p>
      )}

      {items.length === 0 ? (
        <Card variant="tinted" className="flex flex-col items-center gap-3 rounded-[32px] bg-surface-container px-6 py-12 text-center">
          <span className="shape-cookie9 grid size-20 place-items-center bg-secondary-container text-on-secondary-container">
            <Icon name="inventory_2" size={32} />
          </span>
          <p className="text-body-large text-on-surface">{emptyMessage ?? `No ${noun}s yet.`}</p>
          <p className="text-body-medium text-on-surface-variant">Use “{addLabel ?? `Add ${noun}`}” to create one.</p>
        </Card>
      ) : (
        <div>
          <SortableList
            ariaLabel={`${noun}s`}
            items={items}
            ids={ids}
            disabled={narrowed}
            visible={visible}
            labelFor={(_, index) => label(index)}
            onReorder={move}
            className="segmented-list"
            render={({ index, handle }) => {
              const summary = summaries[index];
              const issues = issuesFor?.(index) ?? NO_ISSUES;
              const menuItems: MenuItem[] = [
                { label: "Duplicate", icon: "content_copy", onSelect: () => duplicate(index) },
                { label: "Move up", icon: "arrow_upward", onSelect: () => move(index, index - 1), disabled: index === 0 || narrowed },
                { label: "Move down", icon: "arrow_downward", onSelect: () => move(index, index + 1), disabled: index === items.length - 1 || narrowed },
                ...(extraActions?.(items[index], index) ?? []),
                { type: "divider" },
                { label: "Delete", icon: "delete", destructive: true, onSelect: () => setDeleting(index) },
              ];
              return (
                <div
                  className="flex min-h-18 items-center gap-2 py-2 ps-1 pe-2 animate-rise compact:gap-3"
                  style={{ animationDelay: `${Math.min(index, 8) * 45}ms` }}
                >
                  {handle}
                  {showThumbnails && <ItemThumbnail src={summary.image ?? ""} round={roundThumbnails} />}
                  <button
                    type="button"
                    onClick={() => setEditing({ index, item: items[index] })}
                    className="focus-ring flex min-w-0 flex-1 cursor-pointer flex-col items-start rounded-xs text-start"
                  >
                    <span className="flex max-w-full items-center gap-2">
                      <span className={cn("truncate text-body-large", summary.primary ? "text-on-surface" : "text-on-surface-variant italic")}>
                        {summary.primary || "Untitled"}
                      </span>
                      {issues.errors.length > 0 && (
                        <Tooltip content={issues.errors.map((issue) => issue.message).join(" · ")}>
                          <span className="inline-flex text-error" aria-label={`${issues.errors.length} problems`}>
                            <Icon name="error" size={18} filled />
                          </span>
                        </Tooltip>
                      )}
                      {issues.errors.length === 0 && issues.warnings.length > 0 && (
                        <Tooltip content={issues.warnings.map((issue) => issue.message).join(" · ")}>
                          <span className="inline-flex text-tertiary" aria-label={`${issues.warnings.length} things to check`}>
                            <Icon name="warning" size={18} filled />
                          </span>
                        </Tooltip>
                      )}
                    </span>
                    {summary.secondary && (
                      <span className="line-clamp-2 text-body-medium text-on-surface-variant">{summary.secondary}</span>
                    )}
                  </button>
                  <IconButton
                    icon="edit"
                    label={`Edit ${label(index)}`}
                    className="hidden compact:inline-flex"
                    onClick={() => setEditing({ index, item: items[index] })}
                  />
                  <Menu trigger={<IconButton icon="more_vert" label={`More actions for ${label(index)}`} />} items={menuItems} />
                </div>
              );
            }}
          />
        </div>
      )}

      {!showFab && (
        <div>
          <Button variant="tonal" icon="add" onClick={addNew}>
            {addLabel ?? `Add ${noun}`}
          </Button>
        </div>
      )}

      {showFab && (
        <div className="pointer-events-none fixed inset-x-0 bottom-0 z-20 flex justify-end p-4 medium:p-6">
          <Fab
            icon="add"
            label={addLabel ?? `Add ${noun}`}
            extended
            className="pointer-events-auto"
            onClick={addNew}
          />
        </div>
      )}

      <Dialog
        open={editing !== null}
        onOpenChange={(open) => !open && setEditing(null)}
        title={editing?.index === null ? (addLabel ?? `Add ${noun}`) : `Edit ${noun}`}
        fullScreenOnMobile
        wide={wideDialog}
        confirmLabel={editing?.index === null ? "Add" : "Done"}
        confirmForm={formId}
      >
        {editing && (
          <Form
            formId={formId}
            item={editing.item}
            isNew={editing.index === null}
            issues={editing.index === null ? NO_ISSUES : (issuesFor?.(editing.index) ?? NO_ISSUES)}
            onSubmit={submit}
          />
        )}
      </Dialog>

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        icon="delete"
        destructive
        title={`Delete ${deleting !== null ? label(deleting) : noun}?`}
        description="It is removed from the draft. The live site changes only after you publish."
        confirmLabel="Delete"
        onConfirm={() => {
          if (deleting !== null) remove(deleting);
          setDeleting(null);
        }}
      />
    </div>
  );
}
