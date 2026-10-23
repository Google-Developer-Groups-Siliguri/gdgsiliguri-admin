export const UPLOAD_KINDS = [
  "team",
  "speaker",
  "sponsor",
  "partner",
  "branding",
  "event",
] as const;

export type UploadKind = (typeof UPLOAD_KINDS)[number];

export function isUploadKind(value: unknown): value is UploadKind {
  return typeof value === "string" && (UPLOAD_KINDS as readonly string[]).includes(value);
}

export function uploadFolder(kind: UploadKind, year: number): string {
  switch (kind) {
    case "team":
      return "/teams";
    case "speaker":
      return `/speakers/${year}`;
    case "sponsor":
      return "/Sponsors";
    case "partner":
      return `/community partners/${year}`;
    case "branding":
      return "/Logos and Banners";
    case "event":
      return `/events/${year}`;
  }
}

export const ALLOWED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif", "image/svg+xml"] as const;
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

export function safeFileName(rawName: string): string {
  const name = rawName.split(/[\\/]/).pop() ?? "";
  const dot = name.lastIndexOf(".");
  const base = (dot >= 0 ? name.slice(0, dot) : name)
    .normalize("NFKD")
    .replace(/[^\w.-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[.-]+|[.-]+$/g, "")
    .slice(0, 60);
  const extension = dot >= 0 ? name.slice(dot + 1).toLowerCase().replace(/[^a-z0-9]/g, "") : "";
  return `${base || "image"}${extension ? `.${extension}` : ""}`;
}
