import type { TopicMessage } from "firebase-admin/messaging";

import type { TtlSeconds } from "@/lib/cms/notification-fields";

const TOPICS = { everyone: "all", test: "debug" } as const;

export type PushTarget = keyof typeof TOPICS;

export type PushContent = { id: string; title: string; body: string; ttlSeconds: TtlSeconds };

export function buildPushMessage(content: PushContent, target: PushTarget, nowMs = Date.now()): TopicMessage {
  const nowSeconds = Math.floor(nowMs / 1000);
  return {
    topic: TOPICS[target],
    notification: { title: content.title, body: content.body },
    android: {
      priority: "high",
      ttl: content.ttlSeconds * 1000,
      notification: { channelId: "announcements" },
    },
    apns: {
      headers: {
        "apns-priority": "10",
        "apns-expiration": String(nowSeconds + content.ttlSeconds),
      },
      payload: { aps: { sound: "default" } },
    },
    fcmOptions: { analyticsLabel: `announce-${content.id}` },
  };
}
