import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { TopAppBar } from "@/components/m3/TopAppBar";

import { Gallery } from "./Gallery";

export const metadata: Metadata = { title: "Components" };

export default function ComponentsPage() {
  if (process.env.NODE_ENV === "production" && process.env.ENABLE_COMPONENT_GALLERY !== "true") {
    notFound();
  }
  return (
    <div className="min-h-screen bg-surface">
      <TopAppBar title="M3 component gallery" actions={<ThemeToggle />} />
      <div className="grid grid-cols-1 gap-px bg-outline-variant expanded:grid-cols-2">
        <div data-theme="light" className="bg-surface p-4 text-on-surface medium:p-6">
          <p className="mb-6 text-label-large text-on-surface-variant">Light</p>
          <Gallery />
        </div>
        <div data-theme="dark" className="bg-surface p-4 text-on-surface medium:p-6">
          <p className="mb-6 text-label-large text-on-surface-variant">Dark</p>
          <Gallery />
        </div>
      </div>
    </div>
  );
}
