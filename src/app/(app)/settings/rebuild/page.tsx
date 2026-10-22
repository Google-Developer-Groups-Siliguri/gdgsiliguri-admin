import type { Metadata } from "next";

import { Card } from "@/components/m3/Card";
import { Icon } from "@/components/m3/Icon";

export const metadata: Metadata = { title: "Rebuild website" };

export default function Page() {
  return (
    <div className="flex flex-col gap-4 pt-2">
      <h1 className="text-headline-medium text-on-surface">Rebuild website</h1>
      <Card variant="filled" className="flex items-start gap-4 p-5">
        <Icon name="rocket_launch" className="text-on-surface-variant" />
        <div className="flex flex-col gap-1">
          <p className="text-body-large text-on-surface">Trigger a Netlify rebuild so gdgsiliguri.com shows what is published.</p>
          <p className="text-body-medium text-on-surface-variant">This page is being built next.</p>
        </div>
      </Card>
    </div>
  );
}
