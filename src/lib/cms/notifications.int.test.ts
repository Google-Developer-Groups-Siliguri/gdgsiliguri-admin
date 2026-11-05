import { beforeEach, describe, expect, it, vi } from "vitest";

import type { AdminUser, Role } from "@/lib/auth/roles";
import type { Sender } from "@/lib/integrations/fcm";
import { clearFirestore, firestoreDoc } from "@/test/v2-reset";

import {
  deleteNotificationAction,
  saveNotificationAction,
  sendTestAction,
  sendToEveryoneAction,
} from "./notification-actions";
import { getNotification, saveNotification, sendTest, sendToEveryone, type SendDeps } from "./notifications";
import { auditRef } from "./paths";
import { db } from "./repository";

const signedIn = vi.hoisted(() => ({ user: null as AdminUser | null }));

vi.mock("next/cache", () => ({ refresh: () => undefined }));

vi.mock("@/lib/auth/session", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/auth/session")>();
  const { hasRole } = await import("@/lib/auth/roles");
  return {
    ...original,
    requireAdmin: async (role: Role = "editor") => {
      if (!signedIn.user) throw new original.AuthorizationError("Your session has expired.", "signed_out");
      if (!hasRole(signedIn.user, role)) throw new original.AuthorizationError("Only owners can do this.", "forbidden");
      return signedIn.user;
    },
  };
});

const owner = { email: "owner@example.com" };
const editor = { email: "editor@example.com" };
const draft = { title: "Doors open at 8", body: "Bring your ticket QR.", ttlSeconds: 3600 };

function signInAs(role: Role) {
  const email = role === "owner" ? owner.email : editor.email;
  signedIn.user = { uid: role, email, role, displayName: null, photoURL: null };
}

function liveSender(impl: () => Promise<string> = async () => "projects/devfest-siliguri/messages/1") {
  const sender = vi.fn<Sender>(impl);
  const deps: SendDeps = { environment: "live", sender };
  return { sender, deps };
}

async function caught(promise: Promise<unknown>): Promise<{ code?: string }> {
  return promise.then(
    () => {
      throw new Error("expected a rejection");
    },
    (error: { code?: string }) => error,
  );
}

async function auditSummaries(): Promise<string[]> {
  const snapshot = await auditRef(db()).where("action", "==", "notification_send").get();
  return snapshot.docs.map((doc) => String(doc.get("summary")));
}

beforeEach(async () => {
  await clearFirestore();
  signedIn.user = null;
});

describe("roles", () => {
  it("refuses an editor's production send, but lets them save and test", async () => {
    signInAs("editor");
    const saved = await saveNotificationAction(undefined, draft);
    expect(saved.ok).toBe(true);
    const { id, version } = (saved as { data: { id: string; version: number } }).data;

    const refused = await sendToEveryoneAction(id, version, { allowRepeat: false });
    expect(refused).toEqual({ ok: false, message: "Only owners can do this." });
    expect((await getNotification(id)).status).toBe("draft");

    expect(await sendTestAction(id, version)).toEqual({ ok: true, data: null });
    const tested = await getNotification(id);
    expect(tested).toMatchObject({ status: "draft", lastTestBy: editor.email });
    expect(tested.lastTestAt).not.toBeNull();
    expect(await auditSummaries()).toEqual(['Sent a test of "Doors open at 8" to debug builds']);
  });

  it("lets an owner send through the action, which fakes the send in the emulator", async () => {
    signInAs("owner");
    const { id, version } = await saveNotification(undefined, draft, undefined, owner);
    const result = await sendToEveryoneAction(id, version, { allowRepeat: false });
    expect(result.ok).toBe(true);
    const sent = await getNotification(id);
    expect(sent).toMatchObject({ status: "sent", sentBy: owner.email });
    expect(sent.messageId).toMatch(/^emulator\//);
  });

  it("validates ids and versions before doing anything", async () => {
    signInAs("owner");
    expect(await sendToEveryoneAction("../x", 1, { allowRepeat: false })).toEqual({
      ok: false,
      message: "Invalid request.",
    });
    expect(await sendTestAction("abc", 0)).toEqual({ ok: false, message: "Invalid request." });
    expect(await deleteNotificationAction("a/b")).toEqual({ ok: false, message: "Invalid request." });
  });
});

describe("drafts", () => {
  it("bumps the version on every edit and rejects a stale one", async () => {
    const { id } = await saveNotification(undefined, draft, undefined, editor);
    expect(await saveNotification(id, { ...draft, title: "Doors open at 8:30" }, 1, editor)).toEqual({ id, version: 2 });
    expect((await caught(saveNotification(id, draft, 1, owner))).code).toBe("stale_version");
    expect((await getNotification(id)).title).toBe("Doors open at 8:30");
  });

  it("rejects unknown fields from the client", async () => {
    signInAs("editor");
    const result = await saveNotificationAction(undefined, { ...draft, topic: "all" });
    expect(result.ok).toBe(false);
  });

  it("keeps sent announcements immutable", async () => {
    const { id, version } = await saveNotification(undefined, draft, undefined, owner);
    await sendToEveryone(id, version, { allowRepeat: false }, owner, liveSender().deps);
    expect((await caught(saveNotification(id, draft, version, owner))).code).toBe("not_draft");
    signInAs("editor");
    expect(await deleteNotificationAction(id)).toMatchObject({ ok: false, code: "not_draft" });
    expect((await getNotification(id)).status).toBe("sent");
  });
});

describe("sending to everyone", () => {
  it("sends once when two owners click at the same time", async () => {
    const { id, version } = await saveNotification(undefined, draft, undefined, owner);
    const { sender, deps } = liveSender();
    const results = await Promise.allSettled([
      sendToEveryone(id, version, { allowRepeat: true }, owner, deps),
      sendToEveryone(id, version, { allowRepeat: true }, { email: "other@example.com" }, deps),
    ]);
    expect(sender).toHaveBeenCalledTimes(1);
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    const rejected = results.find((result) => result.status === "rejected") as PromiseRejectedResult;
    expect(rejected.reason.code).toBe("not_draft");
    expect((await getNotification(id)).status).toBe("sent");
  });

  it("sends the saved content to the everyone topic", async () => {
    const { id, version } = await saveNotification(undefined, draft, undefined, owner);
    const { sender, deps } = liveSender();
    expect(await sendToEveryone(id, version, { allowRepeat: false }, owner, deps)).toEqual({
      status: "sent",
      messageId: "projects/devfest-siliguri/messages/1",
    });
    expect(sender.mock.calls[0][0]).toMatchObject({
      topic: "all",
      notification: { title: draft.title, body: draft.body },
      fcmOptions: { analyticsLabel: `announce-${id}` },
    });
    const sent = await getNotification(id);
    expect(sent).toMatchObject({ status: "sent", messageId: "projects/devfest-siliguri/messages/1" });
    expect(sent.sentAt).not.toBeNull();
    expect(await firestoreDoc("cms/root/settings/notifications")).toHaveProperty("lastProductionSendAt");
  });

  it("rejects a stale version without sending", async () => {
    const { id } = await saveNotification(undefined, draft, undefined, owner);
    await saveNotification(id, { ...draft, body: "Changed." }, 1, editor);
    const { sender, deps } = liveSender();
    expect((await caught(sendToEveryone(id, 1, { allowRepeat: false }, owner, deps))).code).toBe("stale_version");
    expect(sender).not.toHaveBeenCalled();
    expect((await getNotification(id)).status).toBe("draft");
  });

  it("asks before a second send within five minutes, and allowRepeat passes", async () => {
    const start = Date.now();
    const first = await saveNotification(undefined, draft, undefined, owner);
    const second = await saveNotification(undefined, { ...draft, title: "Lunch is served" }, undefined, owner);
    const { sender, deps } = liveSender();
    await sendToEveryone(first.id, first.version, { allowRepeat: false }, owner, { ...deps, now: () => start });

    const blocked = await caught(
      sendToEveryone(second.id, second.version, { allowRepeat: false }, owner, { ...deps, now: () => start + 120_000 }),
    );
    expect(blocked).toMatchObject({ code: "recent_send", message: "An announcement went out 2 minutes ago." });
    expect((await getNotification(second.id)).status).toBe("draft");
    expect(sender).toHaveBeenCalledTimes(1);

    await sendToEveryone(second.id, second.version, { allowRepeat: true }, owner, { ...deps, now: () => start + 120_000 });
    expect(sender).toHaveBeenCalledTimes(2);
    expect((await getNotification(second.id)).status).toBe("sent");
  });

  it("allows a send once five minutes have passed", async () => {
    const start = Date.now();
    const first = await saveNotification(undefined, draft, undefined, owner);
    const second = await saveNotification(undefined, draft, undefined, owner);
    const { deps } = liveSender();
    await sendToEveryone(first.id, first.version, { allowRepeat: false }, owner, { ...deps, now: () => start });
    const result = await sendToEveryone(second.id, second.version, { allowRepeat: false }, owner, {
      ...deps,
      now: () => start + 5 * 60_000 + 1,
    });
    expect(result.status).toBe("sent");
  });

  it("records a failure once and never retries", async () => {
    const { id, version } = await saveNotification(undefined, draft, undefined, owner);
    const { sender, deps } = liveSender(async () => {
      throw Object.assign(new Error("Requested entity was not found."), {
        errorInfo: { code: "messaging/invalid-argument" },
      });
    });
    expect(await sendToEveryone(id, version, { allowRepeat: false }, owner, deps)).toEqual({
      status: "failed",
      errorCode: "messaging/invalid-argument",
    });
    expect(sender).toHaveBeenCalledTimes(1);
    expect(await getNotification(id)).toMatchObject({ status: "failed", errorCode: "messaging/invalid-argument" });
    expect(await auditSummaries()).toEqual(
      expect.arrayContaining([
        'Sent "Doors open at 8" to everyone',
        'Sending "Doors open at 8" to everyone failed (messaging/invalid-argument)',
      ]),
    );
  });

  it("refuses to send when the flag is off outside the emulator", async () => {
    const { id, version } = await saveNotification(undefined, draft, undefined, owner);
    const sender = vi.fn(async () => "never");
    const deps: SendDeps = { environment: "disabled", sender };
    expect((await caught(sendToEveryone(id, version, { allowRepeat: false }, owner, deps))).code).toBe(
      "sending_disabled",
    );
    expect((await caught(sendTest(id, version, editor, deps))).code).toBe("sending_disabled");
    expect(sender).not.toHaveBeenCalled();
    expect((await getNotification(id)).status).toBe("draft");
    expect(await firestoreDoc("cms/root/settings/notifications")).toBeNull();
  });

  it("writes an audit entry naming the target and title", async () => {
    const { id, version } = await saveNotification(undefined, draft, undefined, owner);
    await sendToEveryone(id, version, { allowRepeat: false }, owner, liveSender().deps);
    const snapshot = await auditRef(db()).where("action", "==", "notification_send").get();
    expect(snapshot.docs.map((doc) => doc.data())).toEqual([
      expect.objectContaining({
        actorEmail: owner.email,
        action: "notification_send",
        summary: 'Sent "Doors open at 8" to everyone',
      }),
    ]);
  });
});

describe("tests", () => {
  it("sends the saved draft to the debug topic and leaves it a draft", async () => {
    const { id, version } = await saveNotification(undefined, draft, undefined, editor);
    const { sender, deps } = liveSender();
    await sendTest(id, version, editor, deps);
    expect(sender).toHaveBeenCalledTimes(1);
    expect(sender.mock.calls[0][0]).toMatchObject({ topic: "debug" });
    expect((await getNotification(id)).status).toBe("draft");
    expect(await firestoreDoc("cms/root/settings/notifications")).toBeNull();
  });
});
