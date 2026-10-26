import type { Metadata } from "next";
import { Suspense } from "react";

import { UploadProvider } from "@/components/editor/upload";
import { ReviewsEditor } from "@/components/editors/ReviewsEditor";
import { EditorFallback } from "@/components/section/EditorFallback";
import { orNotFound } from "@/lib/cms/load";
import { loadSection } from "@/lib/cms/queries";
import type { SectionState } from "@/lib/cms/repository";
import type { Testimonial } from "@/lib/schema/v2";

export const metadata: Metadata = { title: "Reviews" };

async function Editor() {
  const { state, visibility } = await orNotFound(loadSection("testimonials"));
  return (
    <UploadProvider kind="testimonial">
      <ReviewsEditor state={state as SectionState<{ items: Testimonial[] }>} visibility={visibility} />
    </UploadProvider>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<EditorFallback />}>
      <Editor />
    </Suspense>
  );
}
