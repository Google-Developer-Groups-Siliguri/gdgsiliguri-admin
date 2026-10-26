"use client";

import { MarkdownInput } from "@/components/editor/content-fields";
import { TextInput } from "@/components/editor/fields";
import { ItemFormShell, useItemForm, warningsByField } from "@/components/editor/ItemForm";
import type { ItemFormProps } from "@/components/editor/ListEditor";
import { ListSectionEditor } from "@/components/editor/ListSectionEditor";
import type { Visibility } from "@/lib/cms/queries";
import type { SectionState } from "@/lib/cms/repository";
import { sectionWarnings } from "@/lib/cms/warnings";
import type { Faq } from "@/lib/schema/v2";

import { useItemSchema } from "./forms";

function FaqForm({ formId, item, isNew, issues, onSubmit }: ItemFormProps<Faq>) {
  const form = useItemForm<Faq>(useItemSchema<Faq>(), item, isNew);
  const warnings = warningsByField(issues);
  return (
    <ItemFormShell form={form} formId={formId} item={item} onSubmit={onSubmit}>
      <TextInput
        control={form.control}
        name="question"
        label="Question"
        required
        autoFocus={isNew}
        warning={warnings.question}
      />
      <MarkdownInput control={form.control} name="answer" label="Answer" required warning={warnings.answer} />
    </ItemFormShell>
  );
}

export function FaqEditor({ state, visibility }: { state: SectionState<{ items: Faq[] }>; visibility: Visibility }) {
  return (
    <ListSectionEditor<Faq>
      state={state}
      visibility={visibility}
      noun="question"
      fieldLabels={{ question: "Question", answer: "Answer" }}
      showThumbnails={false}
      warnings={(draft) => sectionWarnings(state.id, draft)}
      summarize={(faq) => ({ primary: faq.question, secondary: faq.answer })}
      createItem={() => ({ id: "", question: "", answer: "", order: 0 })}
      Form={FaqForm}
    />
  );
}
