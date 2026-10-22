import type { Metadata } from "next";
import { Suspense } from "react";

import { Card } from "@/components/m3/Card";
import { Icon } from "@/components/m3/Icon";
import { requireAdminPage } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Admins" };

async function OwnerGate() {
  await requireAdminPage("owner");
  return null;
}

export default function Page() {
  return (
    <div className="flex flex-col gap-4 pt-2">
      <Suspense>
        <OwnerGate />
      </Suspense>
      <h1 className="text-headline-medium text-on-surface">Admins</h1>
      <Card variant="filled" className="flex items-start gap-4 p-5">
        <Icon name="admin_panel_settings" className="text-on-surface-variant" />
        <div className="flex flex-col gap-1">
          <p className="text-body-large text-on-surface">Invite editors and owners, change roles and remove access.</p>
          <p className="text-body-medium text-on-surface-variant">This page is being built next.</p>
        </div>
      </Card>
    </div>
  );
}
