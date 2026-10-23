"use client";

import { useEffect, useState, useTransition } from "react";

import { RelativeTime } from "@/components/RelativeTime";
import { Button } from "@/components/m3/Button";
import { ConfirmDialog } from "@/components/m3/Dialog";
import { LinearProgress } from "@/components/m3/Progress";
import { SideSheet } from "@/components/m3/SideSheet";
import { useSnackbar } from "@/components/m3/Snackbar";
import { listRevisionsAction, revertAction } from "@/lib/content/actions";
import type { RevisionSummary } from "@/lib/content/repository";
import { SECTIONS, type SectionKey } from "@/lib/content/sections";
import { formatDateTime } from "@/lib/time";

type RevisionsSheetProps = {
  sectionKey: SectionKey;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentVersion: number;
  hasUnsavedChanges: boolean;
  onReverted?: () => void;
};

type Load = { status: "loading" } | { status: "error"; message: string } | { status: "ready"; revisions: RevisionSummary[] };

export function RevisionsSheet({
  sectionKey,
  open,
  onOpenChange,
  currentVersion,
  hasUnsavedChanges,
  onReverted,
}: RevisionsSheetProps) {
  const showSnackbar = useSnackbar();
  const [load, setLoad] = useState<Load>({ status: "loading" });
  const [target, setTarget] = useState<RevisionSummary | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    listRevisionsAction(sectionKey).then((result) => {
      if (cancelled) return;
      setLoad(result.ok ? { status: "ready", revisions: result.data } : { status: "error", message: result.message });
    });
    return () => {
      cancelled = true;
      setLoad({ status: "loading" });
    };
  }, [open, sectionKey, currentVersion]);

  function revert() {
    if (!target) return;
    const revision = target;
    startTransition(async () => {
      const result = await revertAction(sectionKey, revision.id);
      setTarget(null);
      if (result.ok) {
        onOpenChange(false);
        onReverted?.();
        showSnackbar({ message: `Version ${revision.version} loaded into the draft. Publish it to make it live.` });
      } else {
        showSnackbar({ message: result.message, tone: "error" });
      }
    });
  }

  return (
    <>
      <SideSheet open={open} onOpenChange={onOpenChange} title={`${SECTIONS[sectionKey].label} history`}>
        {load.status === "loading" && <LinearProgress label="Loading history" />}
        {load.status === "error" && <p className="text-body-medium text-error">{load.message}</p>}
        {load.status === "ready" && (
          <ol className="flex flex-col gap-2">
            {load.revisions.map((revision) => {
              const live = revision.version === currentVersion;
              return (
                <li
                  key={revision.id}
                  className="flex flex-col gap-1 rounded-md bg-surface-container px-4 py-3"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-title-small text-on-surface">Version {revision.version}</span>
                    {live && (
                      <span className="rounded-xs bg-secondary-container px-1.5 text-label-small text-on-secondary-container">
                        Live
                      </span>
                    )}
                    {revision.itemCount !== null && (
                      <span className="ms-auto text-label-medium text-on-surface-variant">
                        {revision.itemCount} items
                      </span>
                    )}
                  </div>
                  <span
                    className="text-body-small text-on-surface-variant"
                    title={formatDateTime(revision.publishedAt)}
                  >
                    <RelativeTime iso={revision.publishedAt} /> · {revision.publishedBy}
                  </span>
                  {revision.note && <span className="text-body-medium text-on-surface">{revision.note}</span>}
                  {!live && (
                    <div className="-ms-3 pt-1">
                      <Button variant="text" icon="restore" onClick={() => setTarget(revision)}>
                        Load into draft
                      </Button>
                    </div>
                  )}
                </li>
              );
            })}
          </ol>
        )}
      </SideSheet>
      <ConfirmDialog
        open={target !== null}
        onOpenChange={(value) => !value && setTarget(null)}
        icon="restore"
        title={`Load version ${target?.version ?? ""} into the draft?`}
        description={
          hasUnsavedChanges
            ? "This replaces the current draft, including your unsaved edits. Nothing changes on the live site until you publish."
            : "This replaces the current draft. Nothing changes on the live site until you publish."
        }
        confirmLabel="Load"
        busy={pending}
        onConfirm={revert}
      />
    </>
  );
}
