import { ALLOWED_IMAGE_TYPES, MAX_UPLOAD_BYTES, safeFileName } from "./folders";
import { convertToWebp, UnreadableImageError } from "./webp";

export type ImageKitConfig = { privateKey: string; urlEndpoint: string };

export type Fetcher = (input: string, init: RequestInit) => Promise<Response>;

export class UploadError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "UploadError";
  }
}

const UPLOAD_URL = "https://upload.imagekit.io/api/v1/files/upload";

export function imageKitConfig(): ImageKitConfig | null {
  const privateKey = process.env.IMAGEKIT_PRIVATE_KEY;
  const urlEndpoint = process.env.IMAGEKIT_URL_ENDPOINT;
  return privateKey && urlEndpoint ? { privateKey, urlEndpoint } : null;
}

export function checkImage(file: { type: string; size: number }): void {
  if (!(ALLOWED_IMAGE_TYPES as readonly string[]).includes(file.type)) {
    throw new UploadError("Upload a PNG, JPEG, WebP, GIF or SVG image.", 415);
  }
  if (file.size === 0) throw new UploadError("That file is empty.", 400);
  if (file.size > MAX_UPLOAD_BYTES) throw new UploadError("Images must be 5 MB or smaller.", 413);
}

export async function uploadToImageKit(
  original: File,
  folder: string,
  config: ImageKitConfig,
  fetcher: Fetcher = fetch,
): Promise<string> {
  checkImage(original);
  const file = await convertToWebp(original).catch((error: unknown) => {
    if (error instanceof UnreadableImageError) throw new UploadError(error.message, 415);
    throw error;
  });
  const body = new FormData();
  body.set("file", file);
  body.set("fileName", safeFileName(file.name));
  body.set("folder", folder);
  body.set("useUniqueFileName", "true");
  body.set("tags", "gdg-siliguri-admin");

  const response = await fetcher(UPLOAD_URL, {
    method: "POST",
    headers: { Authorization: `Basic ${Buffer.from(`${config.privateKey}:`).toString("base64")}` },
    body,
    signal: AbortSignal.timeout(30_000),
  }).catch(() => null);

  if (!response) throw new UploadError("Could not reach ImageKit. Try again.", 502);
  const result = (await response.json().catch(() => ({}))) as { url?: unknown; message?: unknown };
  if (!response.ok || typeof result.url !== "string") {
    const reason = typeof result.message === "string" ? `: ${result.message}` : "";
    throw new UploadError(`ImageKit rejected the upload${reason}`, 502);
  }
  if (!result.url.startsWith("https://")) throw new UploadError("ImageKit returned an unexpected URL.", 502);
  return result.url;
}
