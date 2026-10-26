"use client";

import { EditionSelectInput, MarkdownInput, MediaInput } from "@/components/editor/content-fields";
import { SwitchInput, TextInput } from "@/components/editor/fields";
import { ItemFormShell, useItemForm, warningsByField } from "@/components/editor/ItemForm";
import type { ItemFormProps } from "@/components/editor/ListEditor";
import { ListSectionEditor } from "@/components/editor/ListSectionEditor";
import { useRegistry } from "@/components/registry/RegistryProvider";
import type { Visibility } from "@/lib/cms/queries";
import type { SectionState } from "@/lib/cms/repository";
import { sectionWarnings } from "@/lib/cms/warnings";
import type { Testimonial } from "@/lib/schema/v2";

import { useItemSchema } from "./forms";

function ReviewForm({ formId, item, isNew, issues, onSubmit }: ItemFormProps<Testimonial>) {
  const form = useItemForm<Testimonial>(useItemSchema<Testimonial>(), item, isNew);
  const warnings = warningsByField(issues);
  const { editionYears } = useRegistry();
  const { control } = form;
  return (
    <ItemFormShell form={form} formId={formId} item={item} onSubmit={onSubmit}>
      <TextInput control={control} name="name" label="Name" required autoFocus={isNew} warning={warnings.name} />
      <TextInput control={control} name="title" label="Title" required warning={warnings.title} />
      <MarkdownInput control={control} name="body" label="Review" required warning={warnings.body} />
      <TextInput
        control={control}
        name="eventLabel"
        label="Event"
        supportingText="Shown as written, for example @Devfest'22"
      />
      <EditionSelectInput control={control} name="edition" label="DevFest" years={editionYears} />
      <MediaInput control={control} name="photo" label="Photo URL" shape="circle" optional />
      <SwitchInput
        control={control}
        name="featured"
        label="Featured"
        supportingText="Featured reviews are shown on the website and in the app"
      />
    </ItemFormShell>
  );
}

export function ReviewsEditor({
  state,
  visibility,
}: {
  state: SectionState<{ items: Testimonial[] }>;
  visibility: Visibility;
}) {
  return (
    <ListSectionEditor<Testimonial>
      state={state}
      visibility={visibility}
      noun="review"
      fieldLabels={{ name: "Name", title: "Title", body: "Review", eventLabel: "Event" }}
      showThumbnails={false}
      warnings={(draft) => sectionWarnings(state.id, draft)}
      summarize={(review) => ({
        primary: review.title,
        secondary: [review.name, review.eventLabel].filter(Boolean).join(" "),
        meta: review.featured ? "Featured" : "Hidden",
      })}
      filters={[
        { label: "Featured", test: (review) => review.featured },
        { label: "Not featured", test: (review) => !review.featured },
      ]}
      createItem={() => ({ id: "", name: "", title: "", body: "", featured: true, order: 0 })}
      Form={ReviewForm}
    />
  );
}
