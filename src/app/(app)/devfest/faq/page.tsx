import type { Metadata } from "next";

import { SectionRoute } from "@/components/section/SectionRoute";
import { SECTIONS } from "@/lib/content/sections";

export const metadata: Metadata = { title: SECTIONS.devfestFaqs.label };

export default function Page() {
  return <SectionRoute sectionKey="devfestFaqs" />;
}
