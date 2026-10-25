import type { Metadata } from "next";
import { Suspense } from "react";

import { PageTitle } from "@/components/PageTitle";
import { EditorFallback } from "@/components/section/EditorFallback";
import { AdminsManager } from "@/components/settings/AdminsManager";
import { requireAdminPage } from "@/lib/auth/session";
import { loadAdmins } from "@/lib/content/queries";

export const metadata: Metadata = { title: "Admins" };

async function Manager() {
  const user = await requireAdminPage("owner");
  const admins = await loadAdmins();
  return <AdminsManager admins={admins} currentEmail={user.email} />;
}

export default function Page() {
  return (
    <div className="flex flex-col gap-4 pt-2">
      <PageTitle title="Admins" eyebrow="Settings" />
      <Suspense fallback={<EditorFallback />}>
        <Manager />
      </Suspense>
    </div>
  );
}
