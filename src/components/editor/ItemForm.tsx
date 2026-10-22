"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, type ReactNode } from "react";
import { useForm, type DefaultValues, type FieldValues, type UseFormReturn } from "react-hook-form";
import type { z } from "zod";

import type { ItemIssues } from "./issues";
import { fieldMessages } from "./issues";

export function useItemForm<T extends FieldValues>(
  schema: z.ZodType<T, T>,
  item: T,
  isNew: boolean,
): UseFormReturn<T> {
  const form = useForm<T>({
    resolver: zodResolver(schema),
    defaultValues: item as DefaultValues<T>,
    mode: "onTouched",
  });
  const { trigger } = form;
  useEffect(() => {
    if (!isNew) void trigger();
  }, [isNew, trigger]);
  return form;
}

export function warningsByField(issues: ItemIssues): Record<string, string> {
  return fieldMessages(issues.warnings);
}

type ItemFormShellProps<T extends FieldValues> = {
  form: UseFormReturn<T>;
  formId: string;
  item: T;
  onSubmit: (item: T) => void;
  children: ReactNode;
};

export function ItemFormShell<T extends FieldValues>({
  form,
  formId,
  item,
  onSubmit,
  children,
}: ItemFormShellProps<T>) {
  return (
    <form
      id={formId}
      noValidate
      className="flex flex-col gap-4 py-2"
      onSubmit={(event) => {
        event.stopPropagation();
        void form.handleSubmit((values) => onSubmit({ ...item, ...values }))(event);
      }}
    >
      {children}
    </form>
  );
}
