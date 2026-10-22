"use client";

import type { z } from "zod";

import { TextInput } from "@/components/editor/fields";
import { ItemFormShell, useItemForm, warningsByField } from "@/components/editor/ItemForm";
import type { ItemFormProps } from "@/components/editor/ListEditor";
import { ListSectionEditor } from "@/components/editor/ListSectionEditor";
import type { SectionState } from "@/lib/content/repository";
import { strictSchemas, type Feedback } from "@/lib/content/schemas";

function ReviewForm({ formId, item, isNew, issues, onSubmit }: ItemFormProps<Feedback>) {
  const form = useItemForm<Feedback>(strictSchemas.items.feedback as unknown as z.ZodType<Feedback, Feedback>, item, isNew);
  const warnings = warningsByField(issues);
  const { control } = form;
  return (
    <ItemFormShell form={form} formId={formId} item={item} onSubmit={onSubmit}>
      <TextInput control={control} name="name" label="Name" required autoFocus={isNew} warning={warnings.name} />
      <TextInput
        control={control}
        name="eventAttended"
        label="Event attended"
        supportingText="Shown as written, for example @Devfest'24"
      />
      <TextInput control={control} name="feedbackTitle" label="Title" required warning={warnings.feedbackTitle} />
      <TextInput
        control={control}
        name="feedbackDescription"
        label="Review"
        required
        multiline
        rows={6}
        warning={warnings.feedbackDescription}
      />
    </ItemFormShell>
  );
}

export function ReviewsEditor({ state }: { state: SectionState<"feedbacks"> }) {
  return (
    <ListSectionEditor
      state={state}
      noun="review"
      fieldLabels={{ name: "Name", eventAttended: "Event", feedbackTitle: "Title", feedbackDescription: "Review" }}
      showThumbnails={false}
      summarize={(review) => ({
        primary: review.feedbackTitle,
        secondary: `${review.name} ${review.eventAttended}`.trim(),
      })}
      createItem={() => ({ name: "", eventAttended: "", feedbackTitle: "", feedbackDescription: "" })}
      Form={ReviewForm}
    />
  );
}
