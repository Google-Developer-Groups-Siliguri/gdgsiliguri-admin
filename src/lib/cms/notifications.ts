import "server-only";

import { FieldValue, Timestamp, type DocumentSnapshot, type Query } from "firebase-admin/firestore";
import { z } from "zod";

import {
  buildPushMessage,
  currentSendEnvironment,
  fcmSender,
  pickSender,
  type PushContent,
  type Sender,
} from "@/lib/integrations/fcm";

import { ContentError, issuesFrom } from "./errors";
import {
  BODY_MAX,
  DEFAULT_TTL,
  displayStatus,
  RECENT_SEND_MS,
  TITLE_MAX,
  TTL_OPTIONS,
  type NotificationStatus,
  type NotificationView,
  type SendEnvironment,
  type TtlSeconds,
} from "./notification-fields";
import { auditRef, notificationsRef, settingsRef } from "./paths";
import { auditEntry, db, type Actor } from "./repository";

export const notificationInputSchema = z.strictObject({
  title: z
    .string()
    .trim()
    .min(1, "Add a title.")
    .max(TITLE_MAX, `Keep the title to ${TITLE_MAX} characters.`)
    .regex(/^[^\r\n\u2028\u2029]*$/, "Keep the title on one line."),
  body: z.string().trim().min(1, "Add a message.").max(BODY_MAX, `Keep the message to ${BODY_MAX} characters.`),
  ttlSeconds: z.literal([...TTL_OPTIONS]).default(DEFAULT_TTL),
});

export type NotificationInput = z.input<typeof notificationInputSchema>;

export type SendDeps = { environment?: SendEnvironment; sender?: Sender; now?: () => number };

export type SendResult = { status: "sent"; messageId: string } | { status: "failed"; errorCode: string };

const iso = (value: unknown) => (value instanceof Timestamp ? value.toDate().toISOString() : null);
const text = (value: unknown) => (typeof value === "string" ? value : null);

function toView(snapshot: DocumentSnapshot): NotificationView {
  const data = snapshot.data() ?? {};
  const status = data.status as NotificationStatus;
  const sendStartedAt = iso(data.sendStartedAt);
  return {
    id: snapshot.id,
    title: String(data.title ?? ""),
    body: String(data.body ?? ""),
    ttlSeconds: (data.ttlSeconds as TtlSeconds | undefined) ?? DEFAULT_TTL,
    status,
    displayStatus: displayStatus(status, sendStartedAt),
    version: Number(data.version ?? 1),
    createdBy: String(data.createdBy ?? ""),
    createdAt: iso(data.createdAt),
    updatedBy: String(data.updatedBy ?? ""),
    updatedAt: iso(data.updatedAt),
    lastTestAt: iso(data.lastTestAt),
    lastTestBy: text(data.lastTestBy),
    sentBy: text(data.sentBy),
    sendStartedAt,
    sentAt: iso(data.sentAt),
    messageId: text(data.messageId),
    errorCode: text(data.errorCode),
  };
}

function parseInput(input: unknown) {
  const result = notificationInputSchema.safeParse(input);
  if (!result.success) throw new ContentError("Fix the highlighted problems.", "invalid", issuesFrom(result.error));
  return result.data;
}

function missing(): ContentError {
  return new ContentError("That announcement no longer exists.", "invalid");
}

function requireDraft(view: NotificationView, version: number) {
  if (view.status !== "draft") {
    throw new ContentError("This announcement has already been sent and can't be changed.", "not_draft");
  }
  if (view.version !== version) {
    throw new ContentError("Someone else changed this announcement. Reload to see their version.", "stale_version");
  }
}

export async function listNotifications({ limit = 25, after }: { limit?: number; after?: string } = {}) {
  let query: Query = notificationsRef(db()).orderBy("createdAt", "desc");
  if (after) {
    const cursor = await notificationsRef(db()).doc(after).get();
    if (cursor.exists) query = query.startAfter(cursor);
  }
  const snapshot = await query.limit(limit + 1).get();
  const docs = snapshot.docs.slice(0, limit);
  return {
    items: docs.map(toView),
    next: snapshot.docs.length > limit ? docs[docs.length - 1].id : null,
  };
}

export async function getNotification(id: string): Promise<NotificationView> {
  const snapshot = await notificationsRef(db()).doc(id).get();
  if (!snapshot.exists) throw missing();
  return toView(snapshot);
}

export async function readNotificationSettings(): Promise<{ lastProductionSendAt: string | null }> {
  const data = (await settingsRef(db(), "notifications").get()).data() ?? {};
  return { lastProductionSendAt: iso(data.lastProductionSendAt) };
}

export async function saveNotification(
  id: string | undefined,
  input: unknown,
  version: number | undefined,
  actor: Actor,
): Promise<{ id: string; version: number }> {
  const fields = parseInput(input);
  const stamp = { updatedBy: actor.email, updatedAt: FieldValue.serverTimestamp() };
  if (!id) {
    const ref = notificationsRef(db()).doc();
    await ref.create({
      ...fields,
      status: "draft",
      version: 1,
      createdBy: actor.email,
      createdAt: FieldValue.serverTimestamp(),
      ...stamp,
    });
    return { id: ref.id, version: 1 };
  }
  if (typeof version !== "number") throw new ContentError("Reload and try again.", "stale_version");
  const ref = notificationsRef(db()).doc(id);
  return db().runTransaction(async (tx) => {
    const snapshot = await tx.get(ref);
    if (!snapshot.exists) throw missing();
    requireDraft(toView(snapshot), version);
    tx.update(ref, { ...fields, ...stamp, version: version + 1 });
    return { id, version: version + 1 };
  });
}

export async function deleteNotification(id: string): Promise<void> {
  const ref = notificationsRef(db()).doc(id);
  await db().runTransaction(async (tx) => {
    const snapshot = await tx.get(ref);
    if (!snapshot.exists) throw missing();
    const view = toView(snapshot);
    requireDraft(view, view.version);
    tx.delete(ref);
  });
}

const contentOf = (view: NotificationView): PushContent => ({
  id: view.id,
  title: view.title,
  body: view.body,
  ttlSeconds: view.ttlSeconds,
});

function errorCodeOf(error: unknown): string {
  const candidate = error as { code?: unknown; errorInfo?: { code?: unknown } } | null;
  const code = candidate?.errorInfo?.code ?? candidate?.code;
  return typeof code === "string" && code ? code : "unknown";
}

export async function sendTest(id: string, version: number, actor: Actor, deps: SendDeps = {}): Promise<string> {
  const send = pickSender(deps.environment ?? currentSendEnvironment(), deps.sender ?? fcmSender);
  const view = await getNotification(id);
  requireDraft(view, version);
  const message = buildPushMessage(contentOf(view), "test", deps.now?.());
  let messageId: string;
  try {
    messageId = await send(message);
  } catch (error) {
    const errorCode = errorCodeOf(error);
    await auditRef(db()).add(
      auditEntry(actor, "notification_send", `Test of "${view.title}" to debug builds failed (${errorCode})`),
    );
    throw new ContentError(`The test wasn't sent: ${errorCode}.`, "invalid");
  }
  await notificationsRef(db())
    .doc(id)
    .update({ lastTestAt: FieldValue.serverTimestamp(), lastTestBy: actor.email });
  await auditRef(db()).add(auditEntry(actor, "notification_send", `Sent a test of "${view.title}" to debug builds`));
  return messageId;
}

function minutesSince(fromMs: number, nowMs: number): number {
  return Math.max(1, Math.round((nowMs - fromMs) / 60_000));
}

async function claim(id: string, version: number, allowRepeat: boolean, actor: Actor, nowMs: number) {
  const ref = notificationsRef(db()).doc(id);
  const settings = settingsRef(db(), "notifications");
  return db().runTransaction(async (tx) => {
    const [snapshot, settingsSnapshot] = await Promise.all([tx.get(ref), tx.get(settings)]);
    if (!snapshot.exists) throw missing();
    const view = toView(snapshot);
    requireDraft(view, version);
    const last = settingsSnapshot.get("lastProductionSendAt");
    if (last instanceof Timestamp && nowMs - last.toMillis() < RECENT_SEND_MS && !allowRepeat) {
      const minutes = minutesSince(last.toMillis(), nowMs);
      throw new ContentError(
        `An announcement went out ${minutes} minute${minutes === 1 ? "" : "s"} ago.`,
        "recent_send",
      );
    }
    const startedAt = Timestamp.fromMillis(nowMs);
    tx.update(ref, { status: "sending", sentBy: actor.email, sendStartedAt: startedAt });
    tx.set(settings, { lastProductionSendAt: startedAt }, { merge: true });
    tx.create(auditRef(db()).doc(), auditEntry(actor, "notification_send", `Sent "${view.title}" to everyone`));
    return view;
  });
}

export async function sendToEveryone(
  id: string,
  version: number,
  { allowRepeat }: { allowRepeat: boolean },
  actor: Actor,
  deps: SendDeps = {},
): Promise<SendResult> {
  const send = pickSender(deps.environment ?? currentSendEnvironment(), deps.sender ?? fcmSender);
  const nowMs = deps.now?.() ?? Date.now();
  const view = await claim(id, version, allowRepeat, actor, nowMs);
  const ref = notificationsRef(db()).doc(id);
  let messageId: string;
  try {
    messageId = await send(buildPushMessage(contentOf(view), "everyone", nowMs));
  } catch (error) {
    const errorCode = errorCodeOf(error);
    await ref.update({ status: "failed", errorCode });
    await auditRef(db()).add(
      auditEntry(actor, "notification_send", `Sending "${view.title}" to everyone failed (${errorCode})`),
    );
    return { status: "failed", errorCode };
  }
  try {
    await ref.update({ status: "sent", messageId, sentAt: FieldValue.serverTimestamp() });
  } catch (error) {
    console.error(`FCM accepted announcement ${id} as ${messageId}, but its status couldn't be saved.`, error);
  }
  return { status: "sent", messageId };
}
