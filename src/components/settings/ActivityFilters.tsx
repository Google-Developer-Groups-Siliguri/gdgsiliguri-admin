"use client";

import { usePathname, useRouter } from "next/navigation";

import { Select } from "@/components/m3/Select";
import { SECTION_KEYS, SECTIONS } from "@/lib/content/sections";

const ALL = "all";

type ActivityFiltersProps = {
  section: string | null;
  actor: string | null;
  actors: string[];
};

export function ActivityFilters({ section, actor, actors }: ActivityFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();

  function update(next: { section?: string | null; actor?: string | null }) {
    const params = new URLSearchParams();
    const nextSection = next.section !== undefined ? next.section : section;
    const nextActor = next.actor !== undefined ? next.actor : actor;
    if (nextSection) params.set("section", nextSection);
    if (nextActor) params.set("actor", nextActor);
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  }

  return (
    <div className="grid grid-cols-1 gap-3 compact:grid-cols-2 medium:max-w-2xl">
      <Select
        label="Section"
        variant="outlined"
        value={section ?? ALL}
        options={[{ value: ALL, label: "All sections" }, ...SECTION_KEYS.map((key) => ({ value: key, label: SECTIONS[key].label }))]}
        onValueChange={(value) => update({ section: value === ALL ? null : value })}
      />
      <Select
        label="Person"
        variant="outlined"
        value={actor ?? ALL}
        options={[{ value: ALL, label: "Everyone" }, ...actors.map((email) => ({ value: email, label: email }))]}
        onValueChange={(value) => update({ actor: value === ALL ? null : value })}
      />
    </div>
  );
}
