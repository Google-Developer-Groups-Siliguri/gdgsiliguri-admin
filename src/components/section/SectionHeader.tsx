"use client";

import { useState, type ReactNode } from "react";

import { PageTitle } from "@/components/PageTitle";
import { RelativeTime } from "@/components/RelativeTime";
import { Button } from "@/components/m3/Button";
import { ConfirmDialog } from "@/components/m3/Dialog";
import { IconButton } from "@/components/m3/IconButton";
import { SECTIONS, type SectionKey } from "@/lib/content/sections";
import { formatDateTime } from "@/lib/time";

import { RevisionsSheet } from "./RevisionsSheet";
import { SectionToggle } from "./SectionToggle";
import { sectionStatus, StatusChip } from "./StatusChip";

export type SectionHeaderProps = {
  sectionKey: SectionKey;
  version: number;
  publishedEnabled: boolean | null;
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
  sectionKey,
  version,
  publishedEnabled,
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
  const definition = SECTIONS[sectionKey];
  const [revisionsOpen, setRevisionsOpen] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const hasChanges = dirty || hasDraftChanges;

  return (
    <header className="sticky top-16 z-20 -mx-4 flex flex-col gap-4 bg-surface px-4 pt-2 pb-4 medium:-mx-6 medium:px-6">
      <div className="flex flex-wrap items-end gap-x-4 gap-y-3">
        <PageTitle title={definition.label} eyebrow={definition.group} size="medium" className="me-auto" />
        <StatusChip status={sectionStatus(publishedEnabled, hasChanges)} />
        {definition.hasEnabled && publishedEnabled !== null && (
          <SectionToggle
            sectionKey={sectionKey}
            enabled={publishedEnabled}
            version={version}
            labelled
          />
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span
          className="me-auto text-body-small text-on-surface-variant"
          title={formatDateTime(publishedAt)}
        >
          Published <RelativeTime iso={publishedAt} />
          {publishedBy ? ` by ${publishedBy}` : ""} · version {version}
        </span>
        {extra}
        <IconButton icon="history" label="History" onClick={() => setRevisionsOpen(true)} />
        <Button
          variant="text"
          disabled={!hasChanges || busy !== null}
          onClick={() => setConfirmDiscard(true)}
        >
          Discard
        </Button>
        {onSave && (
          <Button variant="tonal" icon="save" disabled={!dirty || busy !== null} onClick={onSave}>
            {busy === "save" ? "Saving…" : "Save draft"}
          </Button>
        )}
        <Button
          icon="publish"
          disabled={!hasChanges || !canPublish || busy !== null}
          onClick={onPublish}
        >
          {busy === "publish" ? "Publishing…" : "Publish"}
        </Button>
      </div>
      <RevisionsSheet
        sectionKey={sectionKey}
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
