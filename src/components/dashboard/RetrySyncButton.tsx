"use client";

import { useTransition } from "react";

import { Button } from "@/components/m3/Button";
import { useSnackbar } from "@/components/m3/Snackbar";
import { retryLegacySyncAction } from "@/lib/cms/actions";

export function RetrySyncButton() {
  const showSnackbar = useSnackbar();
  const [pending, startTransition] = useTransition();
  return (
    <div>
      <Button
        variant="tonal"
        icon="sync"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const result = await retryLegacySyncAction();
            if (!result.ok) showSnackbar({ message: result.message, tone: "error" });
            else if (result.data.failed.length)
              showSnackbar({ message: "Still can't reach the Realtime Database.", tone: "error" });
            else showSnackbar({ message: "The copy for older app versions is up to date." });
          })
        }
      >
        {pending ? "Retrying…" : "Retry now"}
      </Button>
    </div>
  );
}
