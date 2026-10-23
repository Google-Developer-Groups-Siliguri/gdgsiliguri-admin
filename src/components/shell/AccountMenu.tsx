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
          sideOffset={4}
          className="z-50 w-72 rounded-md bg-surface-container py-2 elevation-2 animate-fade-in"
        >
          <div className="flex items-center gap-3 px-4 py-3">
            <Avatar user={user} size={40} />
            <div className="flex min-w-0 flex-col">
              <span className="truncate text-title-small text-on-surface">
                {user.displayName ?? user.email}
              </span>
              <span className="truncate text-body-small text-on-surface-variant">
                {user.email}
              </span>
              <span className="mt-1 w-fit rounded-xs bg-secondary-container px-1.5 text-label-small text-on-secondary-container capitalize">
                {user.role}
              </span>
            </div>
          </div>
          <DropdownMenu.Separator className="my-2 h-px bg-outline-variant" />
          <DropdownMenu.Item
            disabled={signingOut}
            onSelect={signOut}
            className="state-layer flex h-12 cursor-pointer items-center gap-3 px-4 text-label-large text-on-surface outline-none data-[highlighted]:before:opacity-8"
          >
            <Icon name="logout" className="text-on-surface-variant" />
            Sign out
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
