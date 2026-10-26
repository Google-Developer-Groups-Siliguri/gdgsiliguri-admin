import { ALLOWED_IMAGE_TYPES, MAX_UPLOAD_BYTES, safeFileName } from "./folders";
import { prepareImage, UnreadableImageError } from "./webp";

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
const FILES_URL = "https://api.imagekit.io/v1/files";

export function imageKitConfig(): ImageKitConfig | null {
  const privateKey = process.env.IMAGEKIT_PRIVATE_KEY;
  const urlEndpoint = process.env.IMAGEKIT_URL_ENDPOINT;
  return privateKey && urlEndpoint ? { privateKey, urlEndpoint } : null;
}

function authorization(config: ImageKitConfig): string {
  return `Basic ${Buffer.from(`${config.privateKey}:`).toString("base64")}`;
}

export type ImageKitFile = { fileId: string; name: string; filePath: string; url: string };

export async function listImageKitFiles(
  searchQuery: string,
  config: ImageKitConfig,
  fetcher: Fetcher = fetch,
): Promise<ImageKitFile[]> {
  const response = await fetcher(`${FILES_URL}?${new URLSearchParams({ searchQuery, limit: "1000" })}`, {
    headers: { Authorization: authorization(config) },
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) throw new UploadError(`ImageKit file search failed: ${response.status}`, 502);
  return (await response.json()) as ImageKitFile[];
}

export function checkImage(file: { type: string; size: number }): void {
  if (!(ALLOWED_IMAGE_TYPES as readonly string[]).includes(file.type)) {
    throw new UploadError("Upload a PNG, JPEG, WebP, GIF or SVG image.", 415);
  }
  if (file.size === 0) throw new UploadError("That file is empty.", 400);
  if (file.size > MAX_UPLOAD_BYTES) throw new UploadError("Images must be 5 MB or smaller.", 413);
}

export type UploadedImage = { url: string; width?: number; height?: number };

export async function uploadToImageKit(
  original: File,
  folder: string,
  config: ImageKitConfig,
  fetcher: Fetcher = fetch,
): Promise<UploadedImage> {
  checkImage(original);
  const { file, width, height } = await prepareImage(original).catch((error: unknown) => {
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
    headers: { Authorization: authorization(config) },
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
  return { url: result.url, width, height };
}
