"use client";

import { createContext, use, useRef, useState, type ReactNode } from "react";

import { Button } from "@/components/m3/Button";
import { LinearProgress } from "@/components/m3/Progress";
import { useSnackbar } from "@/components/m3/Snackbar";
import { ALLOWED_IMAGE_TYPES, MAX_UPLOAD_BYTES, type UploadKind } from "@/lib/uploads/folders";

type UploadTarget = { kind: UploadKind; year?: number };

const UploadContext = createContext<UploadTarget | null>(null);

export function UploadProvider({ kind, year, children }: UploadTarget & { children: ReactNode }) {
  return <UploadContext value={{ kind, year }}>{children}</UploadContext>;
}

export function useUploadTarget(): UploadTarget | null {
  return use(UploadContext);
}

function localProblem(file: File): string | null {
  if (!(ALLOWED_IMAGE_TYPES as readonly string[]).includes(file.type)) {
    return "Upload a PNG, JPEG, WebP, GIF or SVG image.";
  }
  if (file.size > MAX_UPLOAD_BYTES) return "Images must be 5 MB or smaller.";
  return null;
}

export function useImageUpload() {
  const target = useUploadTarget();
  const showSnackbar = useSnackbar();
  const [uploading, setUploading] = useState(false);

  async function upload(file: File): Promise<string | null> {
    if (!target) return null;
    const problem = localProblem(file);
    if (problem) {
      showSnackbar({ message: problem, tone: "error" });
      return null;
    }
    setUploading(true);
    const body = new FormData();
    body.set("file", file);
    body.set("kind", target.kind);
    if (target.year) body.set("year", String(target.year));
    const response = await fetch("/api/upload", { method: "POST", body }).catch(() => null);
    const result = (await response?.json().catch(() => null)) as { url?: string; error?: string } | null;
    setUploading(false);
    if (!response?.ok || !result?.url) {
      showSnackbar({ message: result?.error ?? "The upload failed. Try again.", tone: "error" });
      return null;
    }
    showSnackbar({ message: "Image uploaded." });
    return result.url;
  }

  return { available: target !== null, uploading, upload };
}

export function UploadButton({ label, onUploaded }: { label: string; onUploaded: (url: string) => void }) {
  const { available, uploading, upload } = useImageUpload();
  const input = useRef<HTMLInputElement>(null);
  if (!available) return null;

  return (
    <div className="flex flex-col gap-1 ps-1">
      <input
        ref={input}
        type="file"
        accept={ALLOWED_IMAGE_TYPES.join(",")}
        className="sr-only"
        tabIndex={-1}
        aria-label={`Upload ${label}`}
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) void upload(file).then((url) => url && onUploaded(url));
        }}
      />
      <div>
        <Button variant="text" icon="upload" disabled={uploading} onClick={() => input.current?.click()}>
          {uploading ? "Uploading…" : "Upload image"}
        </Button>
      </div>
      {uploading && <LinearProgress label={`Uploading ${label}`} className="max-w-60" />}
    </div>
  );
}
