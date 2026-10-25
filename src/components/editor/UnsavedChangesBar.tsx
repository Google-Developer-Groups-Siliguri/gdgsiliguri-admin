"use client";

import { useState } from "react";

import { ConfirmDialog } from "@/components/m3/Dialog";
import { LoadingIndicator } from "@/components/m3/LoadingIndicator";
import { cn } from "@/lib/cn";

type UnsavedChangesBarProps = {
  dirty: boolean;
  hasDraftChanges: boolean;
  busy: "save" | "publish" | "discard" | null;
  canPublish: boolean;
  onPublish: () => void;
  onDiscard: () => void;
};

export function UnsavedChangesBar({ dirty, hasDraftChanges, busy, canPublish, onPublish, onDiscard }: UnsavedChangesBarProps) {
  const [confirming, setConfirming] = useState(false);
  const visible = dirty || hasDraftChanges;

  return (
    <>
      <div
        role="region"
        aria-label="Unpublished changes"
        aria-hidden={!visible}
        inert={!visible}
        className={cn(
          "fixed bottom-28 left-1/2 z-30 flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-inverse-surface py-2 ps-5 pe-2 whitespace-nowrap text-inverse-on-surface",
          "shadow-[0_20px_40px_-16px_rgb(0_0_0/0.6)] transition-[translate,opacity] duration-[600ms,400ms] ease-emph",
          "medium:bottom-6 medium:left-[calc(50%+48px)] expanded:left-[calc(50%+144px)]",
          visible ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-[calc(100%+40px)] opacity-0",
        )}
      >
        <span className="size-2 rounded-full bg-[#F9AB00]" aria-hidden />
        <span className="ms-1.5 me-3 text-label-large">{dirty ? "Unsaved changes" : "Draft not published"}</span>
        <button
          type="button"
          aria-label="Discard changes"
          disabled={busy !== null}
          onClick={() => setConfirming(true)}
          className="focus-ring h-11 cursor-pointer rounded-full px-4.5 text-label-large transition-colors duration-300 hover:bg-inverse-on-surface/15 disabled:opacity-50"
        >
          Discard
        </button>
        <button
          type="button"
          aria-label="Publish changes"
          disabled={busy !== null || !canPublish}
          onClick={onPublish}
          className="focus-ring press flex h-11 cursor-pointer items-center gap-2 rounded-full bg-inverse-primary px-5 text-label-large font-extrabold text-inverse-surface disabled:cursor-default disabled:opacity-50"
        >
          {busy === "publish" && <LoadingIndicator label="Publishing" size={18} color="currentColor" />}
          {busy === "publish" ? "Publishing" : "Publish"}
        </button>
      </div>
      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        icon="undo"
        destructive
        title="Discard draft changes?"
        description="The draft goes back to what is published now. This can't be undone."
        confirmLabel="Discard"
        onConfirm={() => {
          setConfirming(false);
          onDiscard();
        }}
      />
    </>
  );
}
