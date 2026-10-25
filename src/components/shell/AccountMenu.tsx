"use client";

import { DropdownMenu } from "radix-ui";
import { useState } from "react";

import { Icon } from "@/components/m3/Icon";

import type { ShellUser } from "./ShellUser";

function initials(user: ShellUser): string {
  const source = user.displayName?.trim() || user.email;
  const parts = source.split(/[\s@._-]+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "?";
}

export function Avatar({ user, size = 32 }: { user: ShellUser; size?: number }) {
  if (user.photoURL) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={user.photoURL}
        alt=""
        width={size}
        height={size}
        referrerPolicy="no-referrer"
        className="shrink-0 rounded-full object-cover"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <span
      aria-hidden
      className="flex shrink-0 items-center justify-center rounded-full bg-tertiary-container text-label-large text-on-tertiary-container"
      style={{ width: size, height: size }}
    >
      {initials(user)}
    </span>
  );
}

export function AccountMenu({ user }: { user: ShellUser | null }) {
  const [signingOut, setSigningOut] = useState(false);

  if (!user) {
    return (
      <span
        className="size-10 animate-pulse rounded-full bg-surface-container-highest"
        aria-hidden
      />
    );
  }

  async function signOut() {
    setSigningOut(true);
    await fetch("/api/session/logout", { method: "POST" }).catch(() => undefined);
    window.location.replace("/login");
  }

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger
        aria-label={`Account: ${user.email}`}
        className="state-layer focus-ring flex size-10 cursor-pointer items-center justify-center rounded-full"
      >
        <Avatar user={user} />
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={6}
          className="z-50 origin-(--radix-dropdown-menu-content-transform-origin) rounded-lg bg-surface-container-high p-1.5 shadow-[0_16px_40px_-16px_rgb(0_0_0/0.5)] animate-pop-in flex w-72 flex-col gap-0.5"
        >
          <div className="flex items-center gap-3 rounded-md bg-surface-container px-3 py-3">
            <Avatar user={user} size={40} />
            <div className="flex min-w-0 flex-col">
              <span className="truncate text-title-small text-on-surface">
                {user.displayName ?? user.email}
              </span>
              <span className="truncate text-body-small text-on-surface-variant">
                {user.email}
              </span>
              <span className="mt-1 w-fit rounded-full bg-secondary-container px-2 text-label-small text-on-secondary-container capitalize">
                {user.role}
              </span>
            </div>
          </div>
          <DropdownMenu.Item
            disabled={signingOut}
            onSelect={signOut}
            className="flex h-11 cursor-pointer items-center gap-3 rounded-md px-3 text-label-large text-on-surface outline-none transition-[background-color,border-radius] duration-300 ease-emph data-[highlighted]:rounded-lg data-[highlighted]:bg-surface-container-highest"
          >
            <Icon name="logout" className="text-on-surface-variant" />
            Sign out
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
