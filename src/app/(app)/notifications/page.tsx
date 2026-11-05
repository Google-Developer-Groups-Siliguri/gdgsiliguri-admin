import type { Metadata } from "next";
import { Suspense } from "react";

import { PageTitle } from "@/components/PageTitle";
import { NotificationsWorkspace } from "@/components/notifications/NotificationsWorkspace";
import { EditorFallback } from "@/components/section/EditorFallback";
import { requireAdminPage } from "@/lib/auth/session";
import { listNotifications } from "@/lib/cms/notifications";
import { currentSendEnvironment } from "@/lib/integrations/fcm";

export const metadata: Metadata = { title: "Notifications" };

const PAGE_SIZE = 25;

type SearchParams = Record<string, string | string[] | undefined>;

async function Workspace({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const user = await requireAdminPage("editor");
  const raw = (await searchParams).after;
  const after = typeof raw === "string" && /^[\w-]{1,100}$/.test(raw) ? raw : null;
  const { items, next } = await listNotifications({ limit: PAGE_SIZE, after: after ?? undefined });
  return (
    <NotificationsWorkspace
      role={user.role}
      environment={currentSendEnvironment()}
      items={items}
      after={after}
      next={next}
    />
  );
}

export default function Page({ searchParams }: { searchParams: Promise<SearchParams> }) {
  return (
    <div className="flex flex-col gap-4 pt-2">
      <PageTitle title="Push announcements" eyebrow="Notifications" />
      <Suspense fallback={<EditorFallback />}>
        <Workspace searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
