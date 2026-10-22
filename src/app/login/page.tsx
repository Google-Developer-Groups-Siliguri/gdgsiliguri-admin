import type { Metadata } from "next";
import { Suspense } from "react";

import { ThemeToggle } from "@/components/theme/ThemeToggle";

import { LoginCard } from "./LoginCard";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <main className="flex min-h-dvh flex-col bg-surface-container">
      <div className="flex justify-end p-2">
        <ThemeToggle />
      </div>
      <div className="flex flex-1 items-center justify-center px-4 pb-16">
        <Suspense>
          <LoginCard />
        </Suspense>
      </div>
    </main>
  );
}
