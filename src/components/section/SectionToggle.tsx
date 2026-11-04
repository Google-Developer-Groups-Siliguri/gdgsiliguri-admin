"use client";

import { useState, useTransition } from "react";

import { ConfirmDialog } from "@/components/m3/Dialog";
import { useSnackbar } from "@/components/m3/Snackbar";
import { Switch } from "@/components/m3/Switch";
import { toggleAction, type ActionFailure } from "@/lib/cms/actions";

type SectionToggleProps = {
  sectionId: string;
  label: string;
  enabled: boolean;
  onToggled?: () => void;
  labelled?: boolean;
  pendingChanges?: boolean;
  canPublish?: boolean;
  onSaveIfDirty?: () => Promise<boolean>;
};

function failureMessage(result: ActionFailure): string {
  return result.issues?.length ? result.issues.map((issue) => issue.message).join(". ") : result.message;
}

export function SectionToggle({
  sectionId,
  label,
  enabled,
  onToggled,
  labelled = false,
  pendingChanges = false,
  canPublish = true,
  onSaveIfDirty,
}: SectionToggleProps) {
  const showSnackbar = useSnackbar();
  const [pending, startTransition] = useTransition();
  const [requested, setRequested] = useState<boolean | null>(null);
  const [optimistic, setOptimistic] = useState<boolean | null>(null);
  const checked = optimistic ?? enabled;
  const publishesDraft = requested === true && pendingChanges;

  function confirm() {
    if (requested === null) return;
    const next = requested;
    const publishDraft = publishesDraft;
    setRequested(null);
    setOptimistic(next);
    startTransition(async () => {
      if (publishDraft && onSaveIfDirty && !(await onSaveIfDirty())) {
        setOptimistic(null);
        return;
      }
      const result = await toggleAction(sectionId, next, { publishDraft });
      setOptimistic(null);
      if (result.ok) {
        showSnackbar({
          message: `${label} turned ${next ? "on" : "off"}. gdgsiliguri.com ${next ? "shows" : "hides"} it now.`,
        });
        onToggled?.();
      } else {
        showSnackbar({ message: failureMessage(result), tone: "error", duration: 10_000 });
      }
    });
  }

  return (
    <>
      <label
        className={
          labelled
            ? "inline-flex h-14 cursor-pointer items-center gap-3.5 rounded-full bg-surface-container-high ps-5 pe-2.5 transition-colors duration-300 hover:bg-surface-container-highest"
            : "inline-flex cursor-pointer items-center gap-3"
        }
      >
        {labelled && (
          <span className="flex flex-col">
            <span className="text-label-large text-on-surface">Show on website</span>
            <span className={checked ? "text-label-medium text-primary" : "text-label-medium text-on-surface-variant"}>
              {checked ? "Shown on gdgsiliguri.com" : "Hidden from the website"}
            </span>
          </span>
        )}
        <Switch
          checked={checked}
          disabled={pending}
          aria-label={`Show ${label} on the website`}
          onCheckedChange={(value) => setRequested(value)}
        />
      </label>
      <ConfirmDialog
        open={requested !== null}
        onOpenChange={(open) => !open && setRequested(null)}
        icon={requested ? "visibility" : "visibility_off"}
        title={publishesDraft ? `Publish ${label} and turn it on?` : `Turn ${label} ${requested ? "on" : "off"}?`}
        description={
          publishesDraft
            ? canPublish
              ? `Your ${label} changes aren't live yet. This publishes them, then shows ${label} on gdgsiliguri.com and in the app straight away.`
              : `Your ${label} changes aren't live yet and have problems to fix. Fix them first, then turn ${label} on.`
            : requested
              ? `This publishes immediately: ${label} shows on gdgsiliguri.com and in the app straight away. Unpublished draft changes stay in the draft.`
              : `This publishes immediately: ${label} is hidden on gdgsiliguri.com and in the app straight away. Unpublished draft changes stay in the draft.`
        }
        confirmLabel={publishesDraft ? "Publish and turn on" : requested ? "Turn on" : "Turn off"}
        confirmDisabled={publishesDraft && !canPublish}
        destructive={!requested}
        onConfirm={confirm}
      />
    </>
  );
}
