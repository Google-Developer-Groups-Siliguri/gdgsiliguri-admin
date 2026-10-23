import type { Metadata } from "next";
import { Suspense } from "react";

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
      <h1 className="text-headline-medium text-on-surface">Admins</h1>
      <Suspense fallback={<EditorFallback />}>
        <Manager />
      </Suspense>
    </div>
  );
}
