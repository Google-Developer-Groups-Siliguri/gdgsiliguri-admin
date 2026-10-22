"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/m3/Button";

export function SignOutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <Button
      variant="outlined"
      icon="logout"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        await fetch("/api/session/logout", { method: "POST" }).catch(() => undefined);
        router.replace("/login");
        router.refresh();
      }}
    >
      Sign out
    </Button>
  );
}
