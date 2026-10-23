import { NextResponse } from "next/server";

import { isSameOrigin } from "@/lib/auth/same-origin";
import { getCurrentAdmin } from "@/lib/auth/session";
import { isUploadKind, uploadFolder } from "@/lib/uploads/folders";
import { imageKitConfig, UploadError, uploadToImageKit } from "@/lib/uploads/imagekit";

function failure(status: number, message: string) {
  return NextResponse.json({ error: message }, { status });
}

function uploadYear(raw: FormDataEntryValue | null): number {
  const year = Number(raw);
  const current = new Date().getFullYear();
  return Number.isInteger(year) && year >= 2020 && year <= current + 2 ? year : current;
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return failure(403, "Request origin not allowed.");
  const user = await getCurrentAdmin();
  if (!user) return failure(401, "Your session has expired. Sign in again.");

  const config = imageKitConfig();
  if (!config) return failure(503, "Image uploads are not configured. Paste an image URL instead.");

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  const kind = form?.get("kind");
  if (!(file instanceof File) || !isUploadKind(kind)) return failure(400, "Choose an image to upload.");

  try {
    const url = await uploadToImageKit(file, uploadFolder(kind, uploadYear(form!.get("year"))), config);
    return NextResponse.json({ url });
  } catch (error) {
    if (error instanceof UploadError) return failure(error.status, error.message);
    console.error(error);
    return failure(500, "The upload failed. Try again.");
  }
}
