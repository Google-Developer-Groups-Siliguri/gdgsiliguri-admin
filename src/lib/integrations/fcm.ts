import "server-only";

import { randomUUID } from "node:crypto";

import type { TopicMessage } from "firebase-admin/messaging";

import { ContentError } from "@/lib/cms/errors";
import type { SendEnvironment } from "@/lib/cms/notification-fields";
import { adminMessaging } from "@/lib/firebase/admin";
import { useEmulators } from "@/lib/firebase/config";

export { buildPushMessage, type PushContent, type PushTarget } from "./fcm-message";

export type Sender = (message: TopicMessage, validateOnly?: boolean) => Promise<string>;

export const fcmSender: Sender = (message, validateOnly = false) => adminMessaging().send(message, validateOnly);

export const emulatorSender: Sender = async () => `emulator/${randomUUID()}`;

export function currentSendEnvironment(
  emulators: boolean = useEmulators,
  flag: string | undefined = process.env.PUSH_SENDING_ENABLED,
): SendEnvironment {
  if (emulators) return "emulator";
  return flag === "true" ? "live" : "disabled";
}

export function pickSender(environment: SendEnvironment, real: Sender = fcmSender): Sender {
  if (environment === "emulator") return emulatorSender;
  if (environment === "disabled") {
    throw new ContentError("Sending is turned off in this environment.", "sending_disabled");
  }
  return real;
}
