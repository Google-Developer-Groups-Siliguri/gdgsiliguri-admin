"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/m3/Button";
import { Card } from "@/components/m3/Card";
import { ConfirmDialog } from "@/components/m3/Dialog";
import { Icon } from "@/components/m3/Icon";
import { Select } from "@/components/m3/Select";
import { useSnackbar } from "@/components/m3/Snackbar";
import { TextField } from "@/components/m3/TextField";
import type { Role } from "@/lib/auth/roles";
import {
  BODY_MAX,
  DEFAULT_TTL,
  failureReason,
  TITLE_MAX,
  TTL_LABELS,
  TTL_OPTIONS,
  type NotificationView,
  type SendEnvironment,
  type TtlSeconds,
} from "@/lib/cms/notification-fields";
import {
  deleteNotificationAction,
  saveNotificationAction,
  sendTestAction,
  sendToEveryoneAction,
} from "@/lib/cms/notification-actions";

import { NotificationHistory, StatusChip } from "./NotificationHistory";
import { NotificationPreview } from "./NotificationPreview";

type Content = { title: string; body: string; ttlSeconds: TtlSeconds };

type Saved = Content & { id: string; version: number };

type WorkspaceProps = {
  role: Role;
  environment: SendEnvironment;
  items: NotificationView[];
  after: string | null;
  next: string | null;
};

const EMPTY: Content = { title: "", body: "", ttlSeconds: DEFAULT_TTL };

const TTL_SELECT = TTL_OPTIONS.map((value) => ({ value: String(value), label: TTL_LABELS[value] }));

function normalize(content: Content): Content {
  return { title: content.title.trim(), body: content.body.trim(), ttlSeconds: content.ttlSeconds };
}

function sameContent(form: Content, saved: Saved | null): boolean {
  if (!saved) return false;
  const current = normalize(form);
  return current.title === saved.title && current.body === saved.body && current.ttlSeconds === saved.ttlSeconds;
}

function EnvironmentBanner({ environment }: { environment: SendEnvironment }) {
  if (environment === "live") return null;
  const emulator = environment === "emulator";
  return (
    <p
      role="status"
      className={
        emulator
          ? "flex items-center gap-3 rounded-lg bg-tertiary-container px-4 py-3 text-body-medium text-on-tertiary-container"
          : "flex items-center gap-3 rounded-lg bg-error-container px-4 py-3 text-body-medium text-on-error-container"
      }
    >
      <Icon name={emulator ? "science" : "notifications_off"} />
      {emulator ? "Emulator: nothing is really sent." : "Sending is turned off in this environment."}
    </p>
  );
}

function ReadOnly({ item, onCopy }: { item: NotificationView; onCopy: () => void }) {
  return (
    <div className="flex flex-col gap-4">
      <StatusChip status={item.displayStatus} />
      <div className="flex flex-col gap-1">
        <span className="text-label-large text-on-surface-variant">Title</span>
        <p className="text-body-large font-semibold text-on-surface">{item.title}</p>
      </div>
      <div className="flex flex-col gap-1">
        <span className="text-label-large text-on-surface-variant">Message</span>
        <p className="whitespace-pre-wrap text-body-large text-on-surface">{item.body}</p>
      </div>
      <p className="text-body-small text-on-surface-variant">
        Expires if undelivered after {TTL_LABELS[item.ttlSeconds]}.
        {item.messageId ? ` FCM message id: ${item.messageId}.` : ""}
      </p>
      {item.status === "failed" && (
        <p className="text-body-medium font-semibold text-error">{failureReason(item.errorCode)}</p>
      )}
      <p className="text-body-small text-on-surface-variant">
        Sent announcements can&rsquo;t be changed. Copy it into a new draft to send something similar.
      </p>
      <div>
        <Button variant="tonal" icon="content_copy" onClick={onCopy}>
          Use as new draft
        </Button>
      </div>
    </div>
  );
}

export function NotificationsWorkspace({ role, environment, items, after, next }: WorkspaceProps) {
  const showSnackbar = useSnackbar();
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState<Content>(EMPTY);
  const [saved, setSaved] = useState<Saved | null>(null);
  const [viewing, setViewing] = useState<NotificationView | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [repeatPrompt, setRepeatPrompt] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const isOwner = role === "owner";
  const sendingOff = environment === "disabled";
  const clean = sameContent(form, saved);
  const parsedTitle = form.title.trim();
  const parsedBody = form.body.trim();
  const titleError =
    form.title.length > 0 && /[\r\n]/.test(form.title) ? "Keep the title on one line." : undefined;
  const valid =
    parsedTitle.length > 0 && parsedTitle.length <= TITLE_MAX && parsedBody.length > 0 && parsedBody.length <= BODY_MAX;
  const canSend = Boolean(saved) && clean && !sendingOff && !pending;

  function startNew(content: Content = EMPTY) {
    setViewing(null);
    setSaved(null);
    setForm(content);
  }

  function select(item: NotificationView) {
    if (item.status !== "draft") {
      setViewing(item);
      return;
    }
    const content = { title: item.title, body: item.body, ttlSeconds: item.ttlSeconds };
    setViewing(null);
    setForm(content);
    setSaved({ ...content, id: item.id, version: item.version });
  }

  function save() {
    startTransition(async () => {
      const content = normalize(form);
      const result = await saveNotificationAction(saved?.id, content, saved?.version);
      if (!result.ok) {
        showSnackbar({ message: result.message, tone: "error" });
        return;
      }
      setForm(content);
      setSaved({ ...content, ...result.data });
      showSnackbar({ message: "Draft saved." });
    });
  }

  function sendTest() {
    if (!saved) return;
    startTransition(async () => {
      const result = await sendTestAction(saved.id, saved.version);
      showSnackbar(
        result.ok
          ? { message: "Test accepted by FCM. Check a debug build of the app." }
          : { message: result.message, tone: "error" },
      );
    });
  }

  function sendToEveryone(allowRepeat: boolean) {
    if (!saved) return;
    startTransition(async () => {
      const result = await sendToEveryoneAction(saved.id, saved.version, { allowRepeat });
      setConfirming(false);
      setRepeatPrompt(null);
      if (!result.ok) {
        if (result.code === "recent_send" && !allowRepeat) {
          setRepeatPrompt(result.message);
          return;
        }
        showSnackbar({ message: result.message, tone: "error" });
        if (!result.code) startNew();
        return;
      }
      showSnackbar({ message: "Accepted by FCM. It's on its way to everyone who turned on announcements." });
      startNew();
    });
  }

  function remove() {
    if (!saved) return;
    startTransition(async () => {
      const result = await deleteNotificationAction(saved.id);
      setDeleting(false);
      if (!result.ok) {
        showSnackbar({ message: result.message, tone: "error" });
        return;
      }
      showSnackbar({ message: "Draft deleted." });
      startNew();
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <EnvironmentBanner environment={environment} />
      <div className="grid gap-6 expanded:grid-cols-[minmax(0,1fr)_minmax(280px,360px)]">
        <Card className="flex flex-col gap-5 p-5 compact:p-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-title-large">
              {viewing ? "Announcement" : saved ? "Edit draft" : "New announcement"}
            </h2>
            {(viewing || saved) && (
              <Button variant="text" icon="add" onClick={() => startNew()} disabled={pending}>
                New
              </Button>
            )}
          </div>
          {viewing ? (
            <ReadOnly
              item={viewing}
              onCopy={() => startNew({ title: viewing.title, body: viewing.body, ttlSeconds: viewing.ttlSeconds })}
            />
          ) : (
            <>
              <TextField
                label="Title"
                value={form.title}
                maxLength={TITLE_MAX}
                showCounter
                required
                error={titleError}
                onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
              />
              <TextField
                label="Message"
                multiline
                rows={4}
                value={form.body}
                maxLength={BODY_MAX}
                showCounter
                required
                onChange={(event) => setForm((current) => ({ ...current, body: event.target.value }))}
              />
              <Select
                label="Expires if undelivered after"
                options={TTL_SELECT}
                value={String(form.ttlSeconds)}
                onValueChange={(value) =>
                  setForm((current) => ({ ...current, ttlSeconds: Number(value) as TtlSeconds }))
                }
              />
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="secondary"
                  icon="save"
                  disabled={pending || clean || !valid || Boolean(titleError)}
                  onClick={save}
                >
                  Save draft
                </Button>
                <Button variant="tonal" icon="science" disabled={!canSend} onClick={sendTest}>
                  Send test
                </Button>
                {isOwner && (
                  <Button icon="campaign" disabled={!canSend} onClick={() => setConfirming(true)}>
                    Send to everyone
                  </Button>
                )}
                {saved && (
                  <Button variant="text" icon="delete" disabled={pending} onClick={() => setDeleting(true)}>
                    Delete draft
                  </Button>
                )}
              </div>
              <p className="text-body-small text-on-surface-variant">
                {saved && !clean
                  ? "Save your changes before sending, so only what you saved goes out."
                  : "Send test goes to debug builds of the app only."}
                {!isOwner && " An owner needs to send this to everyone."}
              </p>
            </>
          )}
        </Card>
        <NotificationPreview
          title={viewing ? viewing.title : form.title}
          body={viewing ? viewing.body : form.body}
        />
      </div>
      <NotificationHistory
        items={items}
        selectedId={viewing?.id ?? saved?.id ?? null}
        onSelect={select}
        after={after}
        next={next}
      />
      <ConfirmDialog
        open={confirming}
        onOpenChange={(open) => !pending && setConfirming(open)}
        icon="campaign"
        title="Send to everyone?"
        busy={pending}
        confirmLabel="Send to everyone"
        onConfirm={() => sendToEveryone(false)}
        description={
          <>
            <span className="block font-semibold text-on-surface">{saved?.title}</span>
            <span className="mt-1 block whitespace-pre-wrap text-on-surface">{saved?.body}</span>
            <span className="mt-4 block">
              This goes to everyone who turned on announcements. It can&rsquo;t be recalled.
            </span>
          </>
        }
      />
      <ConfirmDialog
        open={repeatPrompt !== null}
        onOpenChange={(open) => !open && !pending && setRepeatPrompt(null)}
        icon="history"
        title="Send another?"
        busy={pending}
        confirmLabel="Yes, send another"
        onConfirm={() => sendToEveryone(true)}
        description={`${repeatPrompt ?? ""} Send another?`}
      />
      <ConfirmDialog
        open={deleting}
        onOpenChange={(open) => !pending && setDeleting(open)}
        icon="delete"
        destructive
        title="Delete this draft?"
        busy={pending}
        confirmLabel="Delete"
        onConfirm={remove}
        description="The draft is removed for everyone. Sent announcements are kept."
      />
    </div>
  );
}
