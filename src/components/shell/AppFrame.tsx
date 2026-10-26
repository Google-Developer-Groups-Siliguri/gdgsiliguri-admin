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
import { useEmulators } from "@/lib/firebase/config";

import { AccountMenu } from "./AccountMenu";
import type { RegistryInput } from "@/lib/sections/registry";

import { navGroups } from "./nav-config";
import type { ShellUser } from "./ShellUser";

export type ShellData = { user: ShellUser | null };
type ShellPromise = Promise<ShellData>;
type Groups = { editor: NavGroup[]; owner: NavGroup[] };

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

type NavProps = {
  shellPromise: ShellPromise;
  registry: Promise<RegistryInput>;
  fallback: Groups;
  render: (groups: NavGroup[]) => ReactNode;
};

function groupsFor(registry: RegistryInput, pathname: string): Groups {
  const all = navGroups(registry, pathname);
  return { editor: visibleGroups(all, false), owner: visibleGroups(all, true) };
}

function WithGroups({ shellPromise, registry, render }: NavProps) {
  const pathname = usePathname();
  const { user } = use(shellPromise);
  const groups = groupsFor(use(registry), pathname);
  return render(user?.role === "owner" ? groups.owner : groups.editor);
}

function RoleAwareNav(props: NavProps) {
  return (
    <Suspense fallback={props.render(props.fallback.editor)}>
      <WithGroups {...props} />
    </Suspense>
  );
}

type AppFrameProps = { shellPromise: ShellPromise; registry: Promise<RegistryInput>; children: ReactNode };

const FALLBACK_REGISTRY: RegistryInput = { activeEdition: new Date().getFullYear(), editionYears: [], modules: [] };

export function AppFrame({ shellPromise, registry, children }: AppFrameProps) {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const groups = groupsFor(FALLBACK_REGISTRY, pathname);
  const current = findNavItem(groups.owner, pathname);

  return (
    <div className="flex min-h-dvh bg-surface">
      <aside className="sticky top-0 hidden h-dvh medium:flex expanded:hidden">
        <RoleAwareNav
          shellPromise={shellPromise}
          registry={registry}
          fallback={groups}
          render={(groups) => (
            <NavigationRail
              groups={groups}
              className="bg-surface"
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
          registry={registry}
          fallback={groups}
          render={(groups) => <NavigationDrawerContent groups={groups} />}
        />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col medium:py-2 medium:pe-2">
        <div className="flex flex-1 flex-col bg-surface-container-low medium:rounded-lg">
          <TopAppBar
            className="bg-surface-container-low medium:rounded-t-lg"
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
                <span className="truncate medium:hidden">{current?.label ?? "GDG Siliguri Admin"}</span>
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
          <main id="main" className="flex min-w-0 flex-1 flex-col px-4 pb-32 medium:px-6 expanded:px-10">
            {children}
          </main>
        </div>
      </div>

      <RoleAwareNav
        shellPromise={shellPromise}
        registry={registry}
        fallback={groups}
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
