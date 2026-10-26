"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/m3/Button";
import { Card } from "@/components/m3/Card";
import { useSnackbar } from "@/components/m3/Snackbar";
import { Switch } from "@/components/m3/Switch";
import { acceptingSubmissionsAction, generateSecretAction } from "@/lib/cms/showcase-actions";

type ShowcaseSettingsProps = { hasSecret: boolean; acceptingSubmissions: boolean; ingestUrl: string };

export function ShowcaseSettings({ hasSecret, acceptingSubmissions, ingestUrl }: ShowcaseSettingsProps) {
  const showSnackbar = useSnackbar();
  const [pending, startTransition] = useTransition();
  const [secret, setSecret] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-4">
      <Card variant="tinted" className="flex flex-col gap-3 rounded-[28px] bg-surface-container p-5">
        <h2 className="text-title-medium text-on-surface">Form secret</h2>
        <p className="text-body-medium text-on-surface-variant">
          The Google Form&apos;s Apps Script sends this with every submission to{" "}
          <code className="font-mono">{ingestUrl}</code>. Only its hash is stored, so it is shown once.
        </p>
        {secret && (
          <p
            className="rounded-md bg-surface-container-highest p-3 font-mono text-body-medium break-all text-on-surface"
            aria-label="New secret"
          >
            {secret}
          </p>
        )}
        <div>
          <Button
            icon="key"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const result = await generateSecretAction();
                if (result.ok) setSecret(result.data);
                else showSnackbar({ message: result.message, tone: "error" });
              })
            }
          >
            {hasSecret ? "Replace the secret" : "Create a secret"}
          </Button>
        </div>
      </Card>
      <label className="flex h-14 cursor-pointer items-center justify-between gap-4 rounded-full bg-surface-container-high ps-5 pe-2.5">
        <span className="text-label-large text-on-surface">Accepting submissions</span>
        <Switch
          checked={acceptingSubmissions}
          disabled={pending}
          aria-label="Accepting submissions"
          onCheckedChange={(value) =>
            startTransition(async () => {
              const result = await acceptingSubmissionsAction(value);
              showSnackbar(
                result.ok
                  ? { message: value ? "Submissions are open." : "Submissions are closed." }
                  : { message: result.message, tone: "error" },
              );
            })
          }
        />
      </label>
    </div>
  );
}
