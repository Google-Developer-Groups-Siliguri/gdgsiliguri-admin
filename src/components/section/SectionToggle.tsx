"use client";

import { useState, useTransition } from "react";

import { ConfirmDialog } from "@/components/m3/Dialog";
import { useSnackbar } from "@/components/m3/Snackbar";
import { Switch } from "@/components/m3/Switch";
import { toggleAction } from "@/lib/content/actions";
import { SECTIONS, type SectionKey } from "@/lib/content/sections";

type SectionToggleProps = {
  sectionKey: SectionKey;
  enabled: boolean;
  version: number;
  onToggled?: () => void;
  labelled?: boolean;
};

export function SectionToggle({
  sectionKey,
  enabled,
  version,
  onToggled,
  labelled = false,
}: SectionToggleProps) {
  const { label } = SECTIONS[sectionKey];
  const showSnackbar = useSnackbar();
  const [pending, startTransition] = useTransition();
  const [requested, setRequested] = useState<boolean | null>(null);
  const [optimistic, setOptimistic] = useState<boolean | null>(null);
  const checked = optimistic ?? enabled;

  function confirm() {
    if (requested === null) return;
    const next = requested;
    setRequested(null);
    setOptimistic(next);
    startTransition(async () => {
      const result = await toggleAction(sectionKey, next, version);
      setOptimistic(null);
      if (result.ok) {
        showSnackbar({ message: `${label} turned ${next ? "on" : "off"}. gdgsiliguri.com ${next ? "shows" : "hides"} it now.` });
        onToggled?.();
      } else {
        showSnackbar({ message: result.message, tone: "error" });
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
        title={`Turn ${label} ${requested ? "on" : "off"}?`}
        description={
          requested
            ? `This publishes immediately: ${label} shows on gdgsiliguri.com straight away. Unpublished draft changes stay in the draft.`
            : `This publishes immediately: ${label} is hidden on gdgsiliguri.com straight away. Unpublished draft changes stay in the draft.`
        }
        confirmLabel={requested ? "Turn on" : "Turn off"}
        destructive={!requested}
        onConfirm={confirm}
      />
    </>
  );
}
