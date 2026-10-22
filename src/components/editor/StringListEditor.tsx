"use client";

import { useState } from "react";

import { Button } from "@/components/m3/Button";
import { IconButton } from "@/components/m3/IconButton";
import { TextField } from "@/components/m3/TextField";
import { deepEqual } from "@/lib/deep-equal";

import { arrayMove, SortableList } from "./SortableList";

type Row = { id: string; text: string };

let rowCounter = 0;
function newRow(text: string): Row {
  rowCounter += 1;
  return { id: `text-${rowCounter}`, text };
}

type StringListEditorProps = {
  label: string;
  noun: string;
  values: string[];
  onChange: (values: string[]) => void;
  errors?: Record<number, string>;
};

export function StringListEditor({ label, noun, values, onChange, errors = {} }: StringListEditorProps) {
  const [rows, setRows] = useState<Row[]>(() => values.map(newRow));
  if (!deepEqual(rows.map((row) => row.text), values)) {
    setRows(values.map(newRow));
  }

  function commit(next: Row[]) {
    setRows(next);
    onChange(next.map((row) => row.text));
  }

  return (
    <div className="flex flex-col gap-2">
      <SortableList
        ariaLabel={label}
        items={rows}
        ids={rows.map((row) => row.id)}
        labelFor={(row, index) => row.text || `${noun} ${index + 1}`}
        onReorder={(from, to) => commit(arrayMove(rows, from, to))}
        className="gap-2"
        render={({ item, index, handle }) => (
          <div className="flex items-start gap-1">
            <div className="pt-2">{handle}</div>
            <TextField
              label={`${noun} ${index + 1}`}
              value={item.text}
              error={errors[index]}
              onChange={(event) =>
                commit(rows.map((row, position) => (position === index ? { ...row, text: event.target.value } : row)))
              }
            />
            <div className="pt-2">
              <IconButton
                icon="delete"
                label={`Remove ${noun.toLowerCase()} ${index + 1}`}
                onClick={() => commit(rows.filter((_, position) => position !== index))}
              />
            </div>
          </div>
        )}
      />
      <div>
        <Button variant="tonal" icon="add" onClick={() => commit([...rows, newRow("")])}>
          Add {noun.toLowerCase()}
        </Button>
      </div>
    </div>
  );
}
