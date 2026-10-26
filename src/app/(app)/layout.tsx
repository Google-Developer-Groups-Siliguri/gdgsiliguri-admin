import { Suspense } from "react";

import { RegistryProvider } from "@/components/registry/RegistryProvider";
import { AppFrame, type ShellData } from "@/components/shell/AppFrame";
import { getCurrentAdmin } from "@/lib/auth/session";
import { db } from "@/lib/cms/repository";
import type { RegistryInput } from "@/lib/sections/registry";
import { loadRegistryInput } from "@/lib/sections/server";

async function loadShell(): Promise<ShellData> {
  const user = await getCurrentAdmin();
  if (!user) return { user: null };
  return {
    user: {
      email: user.email,
      role: user.role,
      displayName: user.displayName,
      photoURL: user.photoURL,
    },
  };
}

async function loadRegistry(): Promise<RegistryInput> {
  const user = await getCurrentAdmin();
  if (!user) return { activeEdition: new Date().getFullYear(), editionYears: [], modules: [] };
  return loadRegistryInput(db());
}

export default function AppLayout({ children }: LayoutProps<"/">) {
  const registry = loadRegistry();
  return (
    <RegistryProvider registry={registry}>
      <Suspense fallback={<div className="min-h-dvh bg-surface" />}>
        <AppFrame shellPromise={loadShell()} registry={registry}>
          {children}
        </AppFrame>
      </Suspense>
    </RegistryProvider>
  );
}
