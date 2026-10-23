"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { Button } from "@/components/m3/Button";
import { Icon } from "@/components/m3/Icon";
import { SECTIONS, type SectionKey } from "@/lib/content/sections";

export function RebuildBanner({ sections }: { sections: SectionKey[] }) {
  const pathname = usePathname();
  if (sections.length === 0 || pathname === "/settings/rebuild") return null;
  const names = sections.map((key) => SECTIONS[key].label);
  const list = names.length > 3 ? `${names.slice(0, 3).join(", ")} and ${names.length - 3} more` : names.join(", ");
  return (
    <div
      role="status"
      className="mb-2 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-md bg-tertiary-container px-4 py-3 text-on-tertiary-container"
    >
      <Icon name="pending" />
      <p className="min-w-0 flex-1 text-body-medium">
        <span className="font-medium">Published. The live site updates after a rebuild.</span>{" "}
        Waiting: {list}.
      </p>
      <Button variant="tonal" icon="rocket_launch" asChild className="bg-surface/60 text-on-tertiary-container">
        <Link href="/settings/rebuild">Rebuild website</Link>
      </Button>
    </div>
  );
}
