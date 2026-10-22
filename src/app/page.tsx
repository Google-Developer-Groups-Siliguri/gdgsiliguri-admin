import { Suspense } from "react";

import { SignOutButton } from "@/components/auth/SignOutButton";
import { BrandMark } from "@/components/BrandMark";
import { Card } from "@/components/m3/Card";
import { LinearProgress } from "@/components/m3/Progress";
import { requireAdminPage } from "@/lib/auth/session";

async function SignedInSummary() {
  const user = await requireAdminPage();
  return (
    <div className="flex flex-col gap-4">
      <p className="text-body-large">
        Signed in as <span className="text-title-medium">{user.email}</span>
      </p>
      <p className="text-body-medium text-on-surface-variant">Role: {user.role}</p>
      <div>
        <SignOutButton />
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-surface-container p-4">
      <Card variant="filled" className="flex w-full max-w-md flex-col gap-6 bg-surface-container-low p-6">
        <BrandMark />
        <Suspense fallback={<LinearProgress />}>
          <SignedInSummary />
        </Suspense>
      </Card>
    </main>
  );
}
