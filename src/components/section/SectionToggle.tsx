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
        showSnackbar({ message: `${label} turned ${next ? "on" : "off"}. The live site updates after a rebuild.` });
        onToggled?.();
      } else {
        showSnackbar({ message: result.message, tone: "error" });
      }
    });
  }

  return (
    <>
      <label className="inline-flex cursor-pointer items-center gap-3">
        {labelled && <span className="text-label-large text-on-surface-variant">Enabled</span>}
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
            ? `This publishes immediately: ${label} will show on gdgsiliguri.com after the next rebuild. Unpublished draft changes stay in the draft.`
            : `This publishes immediately: ${label} will be hidden on gdgsiliguri.com after the next rebuild. Unpublished draft changes stay in the draft.`
        }
        confirmLabel={requested ? "Turn on" : "Turn off"}
        destructive={!requested}
        onConfirm={confirm}
      />
    </>
  );
}
