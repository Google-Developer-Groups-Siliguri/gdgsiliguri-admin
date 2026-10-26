"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useRef } from "react";
import { useForm, useWatch, type DefaultValues, type FieldValues } from "react-hook-form";
import type { z } from "zod";

import { deepEqual } from "@/lib/deep-equal";

type Plain = Record<string, unknown>;

const isPlain = (value: unknown): value is Plain =>
  typeof value === "object" && value !== null && Object.getPrototypeOf(value) === Object.prototype;

// A field missing from reset() values falls back to the value it mounted with, so a restored
// draft without "theme" kept showing the old theme. Missing fields are reset to null instead.
function clearMissing(current: unknown, next: unknown): unknown {
  if (!isPlain(current) || !isPlain(next)) return next;
  const result: Plain = { ...next };
  for (const [key, value] of Object.entries(current)) {
    if (value === undefined) continue;
    result[key] = next[key] === undefined ? null : clearMissing(value, next[key]);
  }
  return result;
}

function dropNulls(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(dropNulls);
  if (!isPlain(value)) return value;
  return Object.fromEntries(
    Object.entries(value)
      .filter(([, entry]) => entry !== null)
      .map(([key, entry]) => [key, dropNulls(entry)]),
  );
}

export function useDocForm<T extends FieldValues>(
  schema: z.ZodType<T, T>,
  draft: T,
  setDraft: (update: (current: T) => T) => void,
) {
  const form = useForm<T>({ resolver: zodResolver(schema), defaultValues: draft as DefaultValues<T>, mode: "onChange" });
  const { control, reset, trigger, getValues } = form;
  const watched = useWatch({ control }) as T;
  const lastSynced = useRef<T>(draft);

  useEffect(() => {
    void trigger();
  }, [trigger]);

  useEffect(() => {
    if (!deepEqual(draft, lastSynced.current)) {
      lastSynced.current = draft;
      reset(clearMissing(getValues(), draft) as T);
    }
  }, [draft, reset, getValues]);

  useEffect(() => {
    const values = dropNulls({ ...lastSynced.current, ...watched }) as T;
    if (deepEqual(values, lastSynced.current)) return;
    lastSynced.current = values;
    setDraft(() => values);
  }, [watched, setDraft]);

  return form;
}
