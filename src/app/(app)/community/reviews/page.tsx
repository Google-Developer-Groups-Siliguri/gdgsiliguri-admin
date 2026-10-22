import type { Metadata } from "next";
import { Suspense } from "react";

import { ReviewsEditor } from "@/components/editors/ReviewsEditor";
import { EditorFallback } from "@/components/section/EditorFallback";
import { loadSection } from "@/lib/content/queries";

export const metadata: Metadata = { title: "Reviews" };

async function Editor() {
  return <ReviewsEditor state={await loadSection("feedbacks")} />;
}

export default function Page() {
  return (
    <Suspense fallback={<EditorFallback />}>
      <Editor />
    </Suspense>
  );
}
