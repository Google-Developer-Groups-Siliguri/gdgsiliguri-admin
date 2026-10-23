"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense, use, useState, type ReactNode } from "react";

import { BrandMark } from "@/components/BrandMark";
import { IconButton } from "@/components/m3/IconButton";
import { NavigationDrawer, NavigationDrawerContent } from "@/components/m3/NavigationDrawer";
import { NavigationRail } from "@/components/m3/NavigationRail";
import { findNavItem, visibleGroups, type NavGroup } from "@/components/m3/navigation";
import { TopAppBar } from "@/components/m3/TopAppBar";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import type { SectionKey } from "@/lib/content/sections";
import { useEmulators } from "@/lib/firebase/config";

import { AccountMenu } from "./AccountMenu";
import { NAV_GROUPS } from "./nav-config";
import { RebuildBanner } from "./RebuildBanner";
import type { ShellUser } from "./ShellUser";

export type ShellData = { user: ShellUser | null; pendingRebuild: SectionKey[] };
type ShellPromise = Promise<ShellData>;

const EDITOR_GROUPS = visibleGroups(NAV_GROUPS, false);
const OWNER_GROUPS = visibleGroups(NAV_GROUPS, true);

function EmulatorBadge() {
  if (!useEmulators) return null;
  return (
    <span className="hidden rounded-sm bg-tertiary-container px-2 py-0.5 text-label-medium text-on-tertiary-container compact:inline">
      Emulators
    </span>
  );
}

function ResolvedAccount({ shellPromise }: { shellPromise: ShellPromise }) {
  return <AccountMenu user={use(shellPromise).user} />;
}

function ResolvedBanner({ shellPromise }: { shellPromise: ShellPromise }) {
  return <RebuildBanner sections={use(shellPromise).pendingRebuild} />;
}

function WithGroups({
  shellPromise,
  render,
}: {
  shellPromise: ShellPromise;
  render: (groups: NavGroup[]) => ReactNode;
}) {
  const { user } = use(shellPromise);
  return render(user?.role === "owner" ? OWNER_GROUPS : EDITOR_GROUPS);
}

function RoleAwareNav({
  shellPromise,
  render,
}: {
  shellPromise: ShellPromise;
  render: (groups: NavGroup[]) => ReactNode;
}) {
  return (
    <Suspense fallback={render(EDITOR_GROUPS)}>
      <WithGroups shellPromise={shellPromise} render={render} />
    </Suspense>
  );
}

export function AppFrame({ shellPromise, children }: { shellPromise: ShellPromise; children: ReactNode }) {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const current = findNavItem(OWNER_GROUPS, pathname);

  return (
    <div className="flex min-h-dvh bg-surface-container">
      <aside className="sticky top-0 hidden h-dvh medium:flex expanded:hidden">
        <RoleAwareNav
          shellPromise={shellPromise}
          render={(groups) => (
            <NavigationRail
              groups={groups}
              className="bg-surface-container"
              header={
                <Link href="/" className="focus-ring rounded-sm" aria-label="Dashboard">
                  <BrandMark withText={false} size={36} />
                </Link>
              }
            />
          )}
        />
      </aside>
      <aside className="sticky top-0 hidden h-dvh w-72 shrink-0 flex-col overflow-y-auto px-3 py-3 expanded:flex">
        <Link href="/" className="focus-ring mb-2 flex h-14 items-center rounded-sm px-4">
          <BrandMark size={32} />
        </Link>
        <RoleAwareNav
          shellPromise={shellPromise}
          render={(groups) => <NavigationDrawerContent groups={groups} />}
        />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col medium:py-2 medium:pe-2">
        <div className="flex flex-1 flex-col bg-surface medium:rounded-xl">
          <TopAppBar
            className="bg-surface medium:rounded-t-xl"
            navigation={
              <IconButton
                icon="menu"
                label="Open navigation"
                className="medium:hidden"
                onClick={() => setDrawerOpen(true)}
              />
            }
            title={
              <span className="flex items-center gap-3">
                <span className="truncate medium:hidden">
                  {current?.label ?? "GDG Siliguri Admin"}
                </span>
                <EmulatorBadge />
              </span>
            }
            actions={
              <>
                <ThemeToggle />
                <Suspense fallback={<AccountMenu user={null} />}>
                  <ResolvedAccount shellPromise={shellPromise} />
                </Suspense>
              </>
            }
          />
          <main id="main" className="flex min-w-0 flex-1 flex-col px-4 pb-28 medium:px-6">
            <Suspense fallback={null}>
              <ResolvedBanner shellPromise={shellPromise} />
            </Suspense>
            {children}
          </main>
        </div>
      </div>

      <RoleAwareNav
        shellPromise={shellPromise}
        render={(groups) => (
          <NavigationDrawer
            open={drawerOpen}
            onOpenChange={setDrawerOpen}
            groups={groups}
            header={<BrandMark size={32} />}
          />
        )}
      />
    </div>
  );
}
