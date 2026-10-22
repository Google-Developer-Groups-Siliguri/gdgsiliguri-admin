import type { Metadata } from "next";

import { Card } from "@/components/m3/Card";
import { Icon } from "@/components/m3/Icon";

export const metadata: Metadata = { title: "Activity log" };

export default function Page() {
  return (
    <div className="flex flex-col gap-4 pt-2">
      <h1 className="text-headline-medium text-on-surface">Activity log</h1>
      <Card variant="filled" className="flex items-start gap-4 p-5">
        <Icon name="history" className="text-on-surface-variant" />
        <div className="flex flex-col gap-1">
          <p className="text-body-large text-on-surface">Every draft, publish, toggle and rebuild, filterable by section and person.</p>
          <p className="text-body-medium text-on-surface-variant">This page is being built next.</p>
        </div>
      </Card>
    </div>
  );
}
