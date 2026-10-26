import { redirect } from "next/navigation";

import { loadRegistry } from "@/lib/cms/queries";

const LEGACY_ROUTES: Record<string, string> = {
  "event-details": "event",
  schedule: "schedule",
  speakers: "speakers",
  sponsors: "sponsors",
  partners: "partners",
  faq: "faq",
};

export default async function Page({ params }: { params: Promise<{ year: string }> }) {
  const { year } = await params;
  if (/^\d{4}$/.test(year)) redirect(`/devfest/${year}/event`);
  const { activeEdition } = await loadRegistry();
  redirect(`/devfest/${activeEdition}/${LEGACY_ROUTES[year] ?? "event"}`);
}
