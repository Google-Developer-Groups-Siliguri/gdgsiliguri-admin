"use server";

import { refresh } from "next/cache";

import { AuthorizationError, requireAdmin } from "@/lib/auth/session";
import type { Role } from "@/lib/auth/roles";

import { ContentError, type ContentErrorCode } from "./errors";
import { failureReason } from "./notification-fields";
import { deleteNotification, saveNotification, sendTest, sendToEveryone, type SendResult } from "./notifications";

export type NotificationActionResult<T = null> =
  | { ok: true; data: T }
  | { ok: false; message: string; code?: ContentErrorCode };

async function run<T>(
  role: Role,
  task: (actor: { email: string }) => Promise<T>,
): Promise<NotificationActionResult<T>> {
  try {
    const actor = await requireAdmin(role);
    const data = await task(actor);
    refresh();
    return { ok: true, data };
  } catch (error) {
    if (error instanceof ContentError) {
      const details = error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ");
      return { ok: false, code: error.code, message: details ? `${error.message} ${details}` : error.message };
    }
    if (error instanceof AuthorizationError) return { ok: false, message: error.message };
    console.error(error);
    return { ok: false, message: "Something went wrong. Try again." };
  }
}

const validId = (id: unknown): id is string => typeof id === "string" && /^[\w-]{1,100}$/.test(id);
const validVersion = (version: unknown): version is number =>
  typeof version === "number" && Number.isInteger(version) && version > 0;
const bad = { ok: false as const, message: "Invalid request." };

export async function saveNotificationAction(id: string | undefined, input: unknown, version?: number) {
  if (id !== undefined && (!validId(id) || !validVersion(version))) return bad;
  return run("editor", (actor) => saveNotification(id, input, version, actor));
}

export async function deleteNotificationAction(id: string) {
  if (!validId(id)) return bad;
  return run("editor", async () => {
    await deleteNotification(id);
    return null;
  });
}

export async function sendTestAction(id: string, version: number) {
  if (!validId(id) || !validVersion(version)) return bad;
  return run("editor", async (actor) => {
    await sendTest(id, version, actor);
    return null;
  });
}

export async function sendToEveryoneAction(
  id: string,
  version: number,
  options: { allowRepeat: boolean },
): Promise<NotificationActionResult<SendResult>> {
  if (!validId(id) || !validVersion(version) || typeof options?.allowRepeat !== "boolean") return bad;
  const result = await run("owner", (actor) => sendToEveryone(id, version, { allowRepeat: options.allowRepeat }, actor));
  if (result.ok && result.data.status === "failed") {
    return { ok: false, message: failureReason(result.data.errorCode) };
  }
  return result;
}
