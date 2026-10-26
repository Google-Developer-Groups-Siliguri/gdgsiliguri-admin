"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useRef } from "react";
import { useForm, useWatch, type DefaultValues, type FieldValues } from "react-hook-form";
import type { z } from "zod";

import { deepEqual } from "@/lib/deep-equal";

export function useDocForm<T extends FieldValues>(
  schema: z.ZodType<T, T>,
  draft: T,
  setDraft: (update: (current: T) => T) => void,
) {
  const form = useForm<T>({ resolver: zodResolver(schema), defaultValues: draft as DefaultValues<T>, mode: "onChange" });
  const { control, reset, trigger } = form;
  const watched = useWatch({ control }) as T;
  const lastSynced = useRef<T>(draft);

  useEffect(() => {
    void trigger();
  }, [trigger]);

  useEffect(() => {
    if (!deepEqual(draft, lastSynced.current)) {
      lastSynced.current = draft;
      reset(draft);
    }
  }, [draft, reset]);

  useEffect(() => {
    const values = { ...lastSynced.current, ...watched } as T;
    if (deepEqual(values, lastSynced.current)) return;
    lastSynced.current = values;
    setDraft(() => values);
  }, [watched, setDraft]);

  return form;
}
