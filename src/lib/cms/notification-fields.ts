export const TITLE_MAX = 65;
export const BODY_MAX = 240;
export const TTL_OPTIONS = [3600, 86400, 259200] as const;
export const DEFAULT_TTL = 86400;
export const RECENT_SEND_MS = 5 * 60_000;
export const STUCK_SENDING_MS = 5 * 60_000;

export type TtlSeconds = (typeof TTL_OPTIONS)[number];

export const TTL_LABELS: Record<TtlSeconds, string> = {
  3600: "1 hour",
  86400: "1 day",
  259200: "3 days",
};

export type NotificationStatus = "draft" | "sending" | "sent" | "failed";

export type DisplayStatus = NotificationStatus | "unknown";

export type SendEnvironment = "emulator" | "disabled" | "live";

export type NotificationView = {
  id: string;
  title: string;
  body: string;
  ttlSeconds: TtlSeconds;
  status: NotificationStatus;
  displayStatus: DisplayStatus;
  version: number;
  createdBy: string;
  createdAt: string | null;
  updatedBy: string;
  updatedAt: string | null;
  lastTestAt: string | null;
  lastTestBy: string | null;
  sentBy: string | null;
  sendStartedAt: string | null;
  sentAt: string | null;
  messageId: string | null;
  errorCode: string | null;
};

export function displayStatus(
  status: NotificationStatus,
  sendStartedAt: string | null,
  now = Date.now(),
): DisplayStatus {
  if (status !== "sending") return status;
  const started = sendStartedAt ? Date.parse(sendStartedAt) : 0;
  return now - started > STUCK_SENDING_MS ? "unknown" : "sending";
}

const FAILURE_REASONS: Record<string, string> = {
  "messaging/invalid-argument": "FCM rejected the message as invalid.",
  "messaging/authentication-error": "FCM didn't accept the portal's service account.",
  "messaging/third-party-auth-error": "Apple rejected the APNs key, so iPhones got nothing.",
  "messaging/mismatched-credential": "The service account belongs to a different Firebase project.",
  "messaging/quota-exceeded": "The FCM sending quota was used up.",
  "messaging/message-rate-exceeded": "Too many messages were sent to this topic. Wait and try again.",
  "messaging/server-unavailable": "FCM was unavailable. Check a device before resending.",
  "messaging/internal-error": "FCM had an internal error. Check a device before resending.",
  "app/network-error": "The network failed. FCM may still have accepted it, so check a device before resending.",
  "app/network-timeout": "The request timed out. FCM may still have accepted it, so check a device before resending.",
};

export function failureReason(code: string | null): string {
  if (!code) return "The send failed for an unknown reason.";
  return FAILURE_REASONS[code] ?? `FCM refused the send (${code}).`;
}
