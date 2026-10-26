export const SESSION_COOKIE = "__session";
export const SESSION_MAX_AGE_MS = 5 * 24 * 60 * 60 * 1000;
export const LOGIN_PATH = "/login";
export const PUBLIC_PATH_PREFIXES = ["/login", "/api/session", "/api/showcase/ingest", "/api/cron"] as const;
