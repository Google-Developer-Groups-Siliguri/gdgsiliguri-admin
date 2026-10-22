"use client";

import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useId, type HTMLAttributes, type ReactNode } from "react";

import { Icon } from "@/components/m3/Icon";
import { cn } from "@/lib/cn";

const objectIds = new WeakMap<object, string>();
let nextId = 0;

export function rowId(item: object): string {
  let id = objectIds.get(item);
  if (!id) {
    nextId += 1;
    id = `row-${nextId}`;
    objectIds.set(item, id);
  }
  return id;
}

export type DragHandleProps = HTMLAttributes<HTMLElement> & { disabled: boolean };

type RowRenderer<T> = (args: {
  item: T;
  index: number;
  handle: ReactNode;
  dragging: boolean;
}) => ReactNode;

function SortableRow<T>({
  id,
  item,
  index,
  label,
  disabled,
  render,
}: {
  id: string;
  item: T;
  index: number;
  label: string;
  disabled: boolean;
  render: RowRenderer<T>;
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } =
    useSortable({ id, disabled });

  const handle = (
    <button
      type="button"
      ref={setActivatorNodeRef}
      {...attributes}
      {...listeners}
      disabled={disabled}
      aria-label={`Reorder ${label}`}
      aria-roledescription="sortable"
      className={cn(
        "state-layer focus-ring flex size-10 shrink-0 touch-none items-center justify-center rounded-full text-on-surface-variant",
        disabled ? "cursor-default opacity-38" : "cursor-grab active:cursor-grabbing",
      )}
    >
      <Icon name="drag_indicator" />
    </button>
  );

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "relative list-none",
        isDragging && "z-10 rounded-md bg-surface-container-high elevation-3",
      )}
    >
      {render({ item, index, handle, dragging: isDragging })}
    </li>
  );
}

type SortableListProps<T> = {
  items: T[];
  ids: string[];
  onReorder: (from: number, to: number) => void;
  render: RowRenderer<T>;
  labelFor: (item: T, index: number) => string;
  disabled?: boolean;
  visible?: (item: T, index: number) => boolean;
  className?: string;
  ariaLabel: string;
};

export function SortableList<T>({
  items,
  ids,
  onReorder,
  render,
  labelFor,
  disabled = false,
  visible,
  className,
  ariaLabel,
}: SortableListProps<T>) {
  const dndId = useId();
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function onDragEnd({ active, over }: DragEndEvent) {
    if (!over || active.id === over.id) return;
    const from = ids.indexOf(String(active.id));
    const to = ids.indexOf(String(over.id));
    if (from !== -1 && to !== -1) onReorder(from, to);
  }

  return (
    <DndContext
      id={dndId}
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={onDragEnd}
      accessibility={{
        announcements: {
          onDragStart: ({ active }) => `Picked up ${labelFor(items[ids.indexOf(String(active.id))], ids.indexOf(String(active.id)))}.`,
          onDragOver: ({ over }) => (over ? `Position ${ids.indexOf(String(over.id)) + 1} of ${ids.length}.` : ""),
          onDragEnd: ({ over }) => (over ? `Dropped at position ${ids.indexOf(String(over.id)) + 1}.` : "Dropped."),
          onDragCancel: () => "Reordering cancelled.",
        },
        screenReaderInstructions: {
          draggable: "Press space to pick up. Use the arrow keys to move, space to drop, escape to cancel.",
        },
      }}
    >
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        <ol aria-label={ariaLabel} className={cn("flex flex-col", className)}>
          {items.map((item, index) =>
            visible && !visible(item, index) ? null : (
              <SortableRow
                key={ids[index]}
                id={ids[index]}
                item={item}
                index={index}
                label={labelFor(item, index)}
                disabled={disabled}
                render={render}
              />
            ),
          )}
        </ol>
      </SortableContext>
    </DndContext>
  );
}

export { arrayMove };
