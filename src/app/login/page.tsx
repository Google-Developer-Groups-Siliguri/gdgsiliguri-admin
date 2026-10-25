import type { Metadata } from "next";
import { Suspense } from "react";

import { Icon } from "@/components/m3/Icon";
import { ThemeToggle } from "@/components/theme/ThemeToggle";

import { LoginCard } from "./LoginCard";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <main className="relative flex min-h-dvh flex-col overflow-hidden bg-surface">
      <div className="flex justify-end p-3">
        <ThemeToggle />
      </div>
      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col items-center justify-center gap-12 px-4 pb-16 expanded:flex-row expanded:justify-between">
        <div className="hidden max-w-xl flex-col gap-6 animate-rise medium:flex">
          <span className="flex items-center gap-2 text-eyebrow text-on-surface-variant">
            <span className="size-2 rounded-full bg-primary" aria-hidden />
            Google Developer Groups
          </span>
          <p className="font-display text-[clamp(56px,7vw,104px)] leading-[0.86] font-extralight tracking-[-0.06em] text-on-surface">
            Run <b className="font-black">GDG</b>
            <br />
            <b className="font-black text-primary">Siliguri</b>
          </p>
          <p className="max-w-md text-body-large text-on-surface-variant">
            Edit the team, events, DevFest schedule and everything else on gdgsiliguri.com.
          </p>
          <div className="flex items-center gap-3" aria-hidden>
            <span className="shape-cookie9 grid size-20 place-items-center bg-primary-container text-on-primary-container">
              <Icon name="groups" size={32} />
            </span>
            <span className="shape-clover4 grid size-16 place-items-center bg-tertiary-container text-on-tertiary-container">
              <Icon name="festival" size={24} />
            </span>
            <span className="shape-sunny grid size-14 place-items-center bg-secondary-container text-on-secondary-container">
              <Icon name="edit" size={20} />
            </span>
          </div>
        </div>
        <Suspense>
          <LoginCard />
        </Suspense>
      </div>
    </main>
  );
}
