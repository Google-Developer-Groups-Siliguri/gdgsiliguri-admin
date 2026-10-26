"use client";

import { useState, type ReactNode } from "react";

import { PageTitle } from "@/components/PageTitle";
import { RelativeTime } from "@/components/RelativeTime";
import { Button } from "@/components/m3/Button";
import { ConfirmDialog } from "@/components/m3/Dialog";
import { IconButton } from "@/components/m3/IconButton";
import { LoadingIndicator } from "@/components/m3/LoadingIndicator";
import type { Visibility } from "@/lib/cms/queries";
import { formatDateTime } from "@/lib/time";

import { RevisionsSheet } from "./RevisionsSheet";
import { SectionToggle } from "./SectionToggle";
import { sectionStatus, StatusChip } from "./StatusChip";

export type SectionHeaderProps = {
  sectionId: string;
  label: string;
  group: string;
  version: number;
  visibility: Visibility;
  hasDraftChanges: boolean;
  dirty: boolean;
  publishedAt: string | null;
  publishedBy: string | null;
  busy?: "save" | "publish" | "discard" | null;
  canPublish?: boolean;
  onSave?: () => void;
  onPublish: () => void;
  onDiscard: () => void;
  onReverted?: () => void;
  extra?: ReactNode;
};

export function SectionHeader({
  sectionId,
  label,
  group,
  version,
  visibility,
  hasDraftChanges,
  dirty,
  publishedAt,
  publishedBy,
  busy = null,
  canPublish = true,
  onSave,
  onPublish,
  onDiscard,
  onReverted,
  extra,
}: SectionHeaderProps) {
  const [revisionsOpen, setRevisionsOpen] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const hasChanges = dirty || hasDraftChanges;

  const hasToggle = visibility !== null;
  const publishedEnabled = visibility?.enabled ?? null;

  const actions = (
    <div className="ms-auto flex flex-wrap items-center justify-end gap-x-1.5 gap-y-3">
      {extra}
      <IconButton icon="history" label="History" onClick={() => setRevisionsOpen(true)} />
      <div className="hidden compact:block">
        <Button
          variant="text"
          size="large"
          className="text-on-surface"
          disabled={!hasChanges || busy !== null}
          onClick={() => setConfirmDiscard(true)}
        >
          Discard
        </Button>
      </div>
      <div className="flex gap-0.5">
        {onSave && (
          <Button
            variant="secondary"
            size="large"
            connected="start"
            icon="save"
            disabled={!dirty || busy !== null}
            onClick={onSave}
          >
            {busy === "save" ? "Saving…" : "Save draft"}
          </Button>
        )}
        <Button
          size="large"
          connected={onSave ? "end" : undefined}
          icon={busy === "publish" ? undefined : "publish"}
          className="min-w-33"
          disabled={!hasChanges || !canPublish || busy !== null}
          onClick={onPublish}
        >
          {busy === "publish" && <LoadingIndicator label="Publishing" size={20} color="currentColor" />}
          {busy === "publish" ? "Publishing" : "Publish"}
        </Button>
      </div>
    </div>
  );

  return (
    <header className="z-20 -mx-4 flex flex-col gap-4 bg-surface-container-low px-4 pt-2 pb-5 medium:sticky medium:top-16 medium:-mx-6 medium:px-6 expanded:-mx-10 expanded:px-10">
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
        <PageTitle title={label} eyebrow={group} size="medium" className="me-auto">
          <div className="flex flex-wrap items-center gap-2.5">
            <StatusChip status={sectionStatus(publishedEnabled, hasChanges)} />
            <span className="text-body-small text-on-surface-variant" title={formatDateTime(publishedAt)}>
              Published <RelativeTime iso={publishedAt} />
              {publishedBy ? ` by ${publishedBy}` : ""} · version {version}
            </span>
          </div>
        </PageTitle>
        {hasToggle ? (
          <div className="ms-auto">
            <SectionToggle sectionId={sectionId} label={label} enabled={visibility.enabled} labelled />
          </div>
        ) : (
          actions
        )}
      </div>
      {hasToggle && actions}
      <RevisionsSheet
        sectionId={sectionId}
        label={label}
        open={revisionsOpen}
        onOpenChange={setRevisionsOpen}
        currentVersion={version}
        hasUnsavedChanges={dirty}
        onReverted={onReverted}
      />
      <ConfirmDialog
        open={confirmDiscard}
        onOpenChange={setConfirmDiscard}
        icon="undo"
        destructive
        title="Discard draft changes?"
        description="The draft goes back to what is published now. This can't be undone."
        confirmLabel="Discard"
        busy={busy === "discard"}
        onConfirm={() => {
          setConfirmDiscard(false);
          onDiscard();
        }}
      />
    </header>
  );
}
