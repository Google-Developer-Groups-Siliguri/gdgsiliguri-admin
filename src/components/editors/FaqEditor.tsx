"use client";

import type { z } from "zod";

import { TextInput } from "@/components/editor/fields";
import { ItemFormShell, useItemForm, warningsByField } from "@/components/editor/ItemForm";
import type { ItemFormProps } from "@/components/editor/ListEditor";
import { ListSectionEditor } from "@/components/editor/ListSectionEditor";
import type { SectionState } from "@/lib/content/repository";
import { strictSchemas, type Faq } from "@/lib/legacy/schemas";

function FaqForm({ formId, item, isNew, issues, onSubmit }: ItemFormProps<Faq>) {
  const form = useItemForm<Faq>(strictSchemas.items.faq as unknown as z.ZodType<Faq, Faq>, item, isNew);
  const warnings = warningsByField(issues);
  return (
    <ItemFormShell form={form} formId={formId} item={item} onSubmit={onSubmit}>
      <TextInput control={form.control} name="question" label="Question" required autoFocus={isNew} warning={warnings.question} />
      <TextInput control={form.control} name="answer" label="Answer" required multiline rows={6} warning={warnings.answer} />
    </ItemFormShell>
  );
}

export function FaqEditor({ state }: { state: SectionState<"devfestFaqs"> | SectionState<"gdgFaqs"> }) {
  return (
    <ListSectionEditor
      state={state as SectionState<"devfestFaqs">}
      noun="question"
      fieldLabels={{ question: "Question", answer: "Answer" }}
      showThumbnails={false}
      summarize={(faq) => ({ primary: faq.question, secondary: faq.answer })}
      createItem={() => ({ question: "", answer: "" })}
      Form={FaqForm}
    />
  );
}
