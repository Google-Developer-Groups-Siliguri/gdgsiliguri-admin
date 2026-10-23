"use client";

import { useState, useTransition } from "react";

import { RelativeTime } from "@/components/RelativeTime";
import { Button } from "@/components/m3/Button";
import { Card } from "@/components/m3/Card";
import { ConfirmDialog } from "@/components/m3/Dialog";
import { Icon } from "@/components/m3/Icon";
import { useSnackbar } from "@/components/m3/Snackbar";
import { SECTIONS, type SectionKey } from "@/lib/content/sections";
import { markRebuiltAction, triggerRebuildAction } from "@/lib/site-actions";
import { formatDateTime } from "@/lib/time";

type RebuildPanelProps = {
  configured: boolean;
  pending: SectionKey[];
  lastRebuildAt: string | null;
  lastRebuildBy: string | null;
};

const STEPS = [
  "Open the gdgsiliguri.com site in Netlify.",
  "Go to Deploys and choose Trigger deploy → Deploy site.",
  "Wait for the deploy to finish (usually a few minutes).",
  "Come back here and press “Mark as rebuilt”.",
];

export function RebuildPanel({ configured, pending, lastRebuildAt, lastRebuildBy }: RebuildPanelProps) {
  const showSnackbar = useSnackbar();
  const [pendingAction, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);

  function run(action: () => Promise<{ ok: boolean; message?: string }>, success: string) {
    startTransition(async () => {
      const result = await action();
      setConfirming(false);
      showSnackbar(result.ok ? { message: success } : { message: result.message ?? "Failed", tone: "error" });
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <Card variant="outlined" className="flex flex-col gap-3 p-5">
        <div className="flex items-center gap-3">
          <Icon name={pending.length ? "pending" : "check_circle"} className={pending.length ? "text-tertiary" : "text-primary"} />
          <h2 className="text-title-medium">
            {pending.length
              ? `${pending.length} ${pending.length === 1 ? "section is" : "sections are"} waiting for a rebuild`
              : "The live site is up to date with everything published"}
          </h2>
        </div>
        {pending.length > 0 && (
          <ul className="flex flex-wrap gap-2 ps-9">
            {pending.map((key) => (
              <li key={key} className="rounded-sm bg-tertiary-container px-2 py-1 text-label-large text-on-tertiary-container">
                {SECTIONS[key].label}
              </li>
            ))}
          </ul>
        )}
        <p className="ps-9 text-body-small text-on-surface-variant" title={formatDateTime(lastRebuildAt)}>
          Last rebuild: <RelativeTime iso={lastRebuildAt} />
          {lastRebuildBy ? ` by ${lastRebuildBy}` : ""}
        </p>
      </Card>

      <Card variant="filled" className="flex flex-col gap-4 p-5">
        <p className="text-body-medium text-on-surface-variant">
          gdgsiliguri.com is built into static pages by Netlify. Visitors see the content from the last build,
          so a published change only appears after the site is rebuilt. Refreshing the page is not enough.
        </p>
        {configured ? (
          <div className="flex flex-wrap gap-2">
            <Button icon="rocket_launch" disabled={pendingAction} onClick={() => setConfirming(true)}>
              Rebuild website
            </Button>
          </div>
        ) : (
          <>
            <ol className="flex list-decimal flex-col gap-1 ps-6 text-body-medium text-on-surface">
              {STEPS.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
            <div className="flex flex-wrap gap-2">
              <Button variant="outlined" trailingIcon="open_in_new" asChild>
                <a href="https://app.netlify.com" target="_blank" rel="noreferrer">
                  Open Netlify
                </a>
              </Button>
              <Button
                icon="task_alt"
                disabled={pendingAction}
                onClick={() => run(markRebuiltAction, "Marked as rebuilt.")}
              >
                Mark as rebuilt
              </Button>
            </div>
          </>
        )}
      </Card>

      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        icon="rocket_launch"
        title="Rebuild gdgsiliguri.com?"
        description="Netlify rebuilds the site from the published content. It takes a few minutes, and only one rebuild can be started every 2 minutes."
        confirmLabel="Rebuild"
        busy={pendingAction}
        onConfirm={() => run(triggerRebuildAction, "Rebuild started on Netlify.")}
      />
    </div>
  );
}
