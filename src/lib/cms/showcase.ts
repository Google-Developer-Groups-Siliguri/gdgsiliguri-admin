import "server-only";

import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

import { FieldValue, type Timestamp } from "firebase-admin/firestore";
import { z } from "zod";

import { strict, type ShowcaseItem } from "@/lib/schema/v2";
import { fromFirestore, toFirestore } from "@/lib/schema/v2/convert";
import { uniqueSlug } from "@/lib/slug";
import { imageKitConfig, uploadToImageKit, type Fetcher } from "@/lib/uploads/imagekit";
import { uploadFolder } from "@/lib/uploads/folders";

import { ContentError, issuesFrom } from "./errors";
import { auditRef, settingsRef, submissionsRef } from "./paths";
import { rebuildBundles } from "./publish";
import { auditEntry, db, type Actor } from "./repository";

export const MAX_INGEST_BYTES = 32 * 1024;
const RATE_LIMIT = 20;
const RATE_WINDOW_MS = 60_000;

const optionalLink = z
  .string()
  .trim()
  .max(500)
  .optional()
  .transform((value) => (value ? value : undefined));

export const ingestSchema = z.strictObject({
  title: z.string().trim().min(1).max(80),
  summary: z.string().trim().min(1).max(280),
  body: z.string().max(5_000).optional(),
  team: z
    .array(z.strictObject({ name: z.string().trim().min(1).max(100), github: optionalLink, linkedin: optionalLink }))
    .min(1)
    .max(8),
  email: z.email(),
  repo: optionalLink,
  demo: optionalLink,
  video: optionalLink,
  tags: z.array(z.string().trim().min(1).max(40)).max(12).optional(),
  imageLinks: z.array(z.string().trim().url()).max(5).optional(),
  edition: z.number().int().min(2000).max(2100),
  consent: z.boolean(),
});

export type IngestBody = z.output<typeof ingestSchema>;

export type SubmissionStatus = "pending" | "approved" | "rejected" | "hidden";

export type Submission = {
  id: string;
  status: SubmissionStatus;
  payload: Omit<ShowcaseItem, "id" | "featured" | "order" | "updatedAt">;
  consent: boolean;
  source: string;
  rawImageLinks: string[];
  submittedAt: string | null;
  reviewedBy?: string;
  reviewedAt?: string;
  reviewNote?: string;
  publishedId?: string;
  hasContact: boolean;
};

export class IngestError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "IngestError";
  }
}

const sha256 = (value: string) => createHash("sha256").update(value).digest("hex");

const recent = new Map<string, number[]>();

function rateLimited(key: string, now = Date.now()): boolean {
  const hits = (recent.get(key) ?? []).filter((at) => now - at < RATE_WINDOW_MS);
  hits.push(now);
  recent.set(key, hits);
  return hits.length > RATE_LIMIT;
}

export function resetRateLimit(): void {
  recent.clear();
}

export async function readShowcaseSettings() {
  const data = (await settingsRef(db(), "showcase").get()).data() ?? {};
  return {
    hasSecret: typeof data.formIngestSecretHash === "string",
    acceptingSubmissions: data.acceptingSubmissions === true,
    secretHash: (data.formIngestSecretHash as string | undefined) ?? null,
  };
}

export async function generateIngestSecret(actor: Actor): Promise<string> {
  const secret = randomBytes(32).toString("base64url");
  await settingsRef(db(), "showcase").set({ formIngestSecretHash: sha256(secret) }, { merge: true });
  await auditRef(db()).add(auditEntry(actor, "showcase_review", "Created a new showcase form secret"));
  return secret;
}

export async function setAcceptingSubmissions(accepting: boolean, actor: Actor): Promise<void> {
  await settingsRef(db(), "showcase").set({ acceptingSubmissions: accepting }, { merge: true });
  await auditRef(db()).add(
    auditEntry(actor, "showcase_review", `${accepting ? "Opened" : "Closed"} showcase submissions`),
  );
}

function secretMatches(sent: string | null, hash: string | null): boolean {
  if (!sent || !hash) return false;
  const given = Buffer.from(sha256(sent), "hex");
  const stored = Buffer.from(hash, "hex");
  return given.length === stored.length && timingSafeEqual(given, stored);
}

function payloadFrom(body: IngestBody): Submission["payload"] {
  const links = Object.fromEntries(
    (["repo", "demo", "video"] as const).flatMap((key) => (body[key] ? [[key, body[key]]] : [])),
  );
  return {
    title: body.title,
    summary: body.summary,
    ...(body.body ? { body: body.body } : {}),
    team: body.team.map(({ name, github, linkedin }) => {
      const memberLinks = Object.fromEntries(
        Object.entries({ github, linkedin }).filter(([, value]) => value) as [string, string][],
      );
      return Object.keys(memberLinks).length ? { name, links: memberLinks } : { name };
    }),
    ...(Object.keys(links).length ? { links } : {}),
    images: [],
    ...(body.tags?.length ? { tags: body.tags } : {}),
    edition: body.edition,
  };
}

export async function ingestSubmission(
  raw: string,
  secret: string | null,
): Promise<{ ok: true; id: string; duplicate: boolean }> {
  if (Buffer.byteLength(raw) > MAX_INGEST_BYTES) throw new IngestError("Request too large.", 413);
  const settings = await readShowcaseSettings();
  if (!secretMatches(secret, settings.secretHash)) throw new IngestError("Not allowed.", 403);
  if (!settings.acceptingSubmissions) throw new IngestError("Submissions are closed.", 403);
  if (rateLimited(settings.secretHash!)) throw new IngestError("Too many requests.", 429);

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(raw);
  } catch {
    throw new IngestError("The body must be JSON.", 400);
  }
  const result = ingestSchema.safeParse(parsedJson);
  if (!result.success) {
    throw new IngestError(
      `Invalid submission: ${result.error.issues.map((issue) => issue.path.join(".")).join(", ")}`,
      400,
    );
  }
  const body = result.data;
  const dedupeKey = sha256(`${body.email.toLowerCase()}\n${body.title.toLowerCase()}`);
  const fields = {
    payload: toFirestore(payloadFrom(body)),
    contact: { email: body.email },
    consent: body.consent,
    source: "google-form",
    dedupeKey,
    rawImageLinks: body.imageLinks ?? [],
  };

  const existing = await submissionsRef(db())
    .where("dedupeKey", "==", dedupeKey)
    .where("status", "==", "pending")
    .limit(1)
    .get();
  if (!existing.empty) {
    await existing.docs[0].ref.update({ ...fields, submittedAt: FieldValue.serverTimestamp() });
    return { ok: true, id: existing.docs[0].id, duplicate: true };
  }
  const ref = await submissionsRef(db()).add({
    ...fields,
    status: "pending",
    submittedAt: FieldValue.serverTimestamp(),
  });
  return { ok: true, id: ref.id, duplicate: false };
}

function toSubmission(id: string, data: Record<string, unknown>): Submission {
  const iso = (value: unknown) => ((value as Timestamp | undefined)?.toDate?.() ?? null)?.toISOString() ?? null;
  return {
    id,
    status: data.status as SubmissionStatus,
    payload: fromFirestore(data.payload) as Submission["payload"],
    consent: Boolean(data.consent),
    source: String(data.source ?? ""),
    rawImageLinks: (data.rawImageLinks as string[] | undefined) ?? [],
    submittedAt: iso(data.submittedAt),
    ...(data.reviewedBy ? { reviewedBy: String(data.reviewedBy) } : {}),
    ...(data.reviewedAt ? { reviewedAt: iso(data.reviewedAt) ?? undefined } : {}),
    ...(data.reviewNote ? { reviewNote: String(data.reviewNote) } : {}),
    ...(data.publishedId ? { publishedId: String(data.publishedId) } : {}),
    hasContact: Boolean(data.contact),
  };
}

export async function listSubmissions(status: SubmissionStatus): Promise<Submission[]> {
  const snapshot = await submissionsRef(db())
    .where("status", "==", status)
    .orderBy("submittedAt", "desc")
    .limit(200)
    .get();
  return snapshot.docs.map((doc) => toSubmission(doc.id, doc.data()));
}

async function loadSubmission(id: string) {
  const ref = submissionsRef(db()).doc(id);
  const snapshot = await ref.get();
  if (!snapshot.exists) throw new ContentError("That submission no longer exists.", "invalid");
  return { ref, submission: toSubmission(id, snapshot.data()!) };
}

export async function updateSubmissionPayload(id: string, payload: unknown): Promise<void> {
  const { ref } = await loadSubmission(id);
  const result = strict.showcaseItem
    .omit({ id: true, featured: true, order: true, updatedAt: true })
    .safeParse(payload);
  if (!result.success) throw new ContentError("Fix the highlighted problems.", "invalid", issuesFrom(result.error));
  await ref.update({ payload: toFirestore(result.data) });
}

async function bundlesFor(edition: number | undefined, actor: Actor): Promise<void> {
  await rebuildBundles(edition ? ["home", `edition-${edition}`] : ["home"], actor);
}

export async function approveSubmission(id: string, actor: Actor): Promise<string> {
  const { ref, submission } = await loadSubmission(id);
  if (!submission.consent)
    throw new ContentError("The team didn't agree to publishing, so it can't be approved.", "invalid");
  const showcase = db().collection("showcase");
  const taken = (await showcase.get()).docs.map((doc) => doc.id);
  const publishedId = submission.publishedId ?? uniqueSlug(submission.payload.title, taken);
  const current = (await showcase.doc(publishedId).get()).data();
  const item = {
    id: publishedId,
    ...submission.payload,
    featured: Boolean(current?.featured),
    order: typeof current?.order === "number" ? current.order : (taken.length + 1) * 10,
  };
  const result = strict.showcaseItem.safeParse(item);
  if (!result.success)
    throw new ContentError("Fix the highlighted problems before approving.", "invalid", issuesFrom(result.error));
  const data = Object.fromEntries(Object.entries(result.data).filter(([key]) => key !== "id"));
  await showcase.doc(publishedId).set({ ...toFirestore(data), updatedAt: FieldValue.serverTimestamp() });
  await ref.update({
    status: "approved",
    publishedId,
    reviewedBy: actor.email,
    reviewedAt: FieldValue.serverTimestamp(),
  });
  await bundlesFor(result.data.edition, actor);
  await auditRef(db()).add(auditEntry(actor, "showcase_review", `Approved the project ${result.data.title}`));
  return publishedId;
}

export async function rejectSubmission(id: string, note: string, actor: Actor): Promise<void> {
  if (!note.trim()) throw new ContentError("Add a note saying why it was rejected.", "invalid");
  const { ref, submission } = await loadSubmission(id);
  await ref.update({
    status: "rejected",
    reviewNote: note.trim(),
    reviewedBy: actor.email,
    reviewedAt: FieldValue.serverTimestamp(),
  });
  await auditRef(db()).add(auditEntry(actor, "showcase_review", `Rejected the project ${submission.payload.title}`));
}

export async function hideSubmission(id: string, actor: Actor): Promise<void> {
  const { ref, submission } = await loadSubmission(id);
  if (submission.publishedId) await db().collection("showcase").doc(submission.publishedId).delete();
  await ref.update({ status: "hidden", reviewedBy: actor.email, reviewedAt: FieldValue.serverTimestamp() });
  await bundlesFor(submission.payload.edition, actor);
  await auditRef(db()).add(auditEntry(actor, "showcase_review", `Hid the project ${submission.payload.title}`));
}

export async function setShowcaseFeatured(showcaseId: string, featured: boolean, actor: Actor): Promise<void> {
  const ref = db().collection("showcase").doc(showcaseId);
  const snapshot = await ref.get();
  if (!snapshot.exists) throw new ContentError("That project is not published.", "invalid");
  await ref.update({ featured, updatedAt: FieldValue.serverTimestamp() });
  await bundlesFor(snapshot.get("edition") as number | undefined, actor);
}

export function driveFileId(link: string): string | null {
  try {
    const url = new URL(link);
    if (!/(^|\.)google\.com$/.test(url.hostname)) return null;
    return url.searchParams.get("id") ?? /\/d\/([\w-]{10,})/.exec(url.pathname)?.[1] ?? null;
  } catch {
    return null;
  }
}

export async function copySubmissionImages(
  id: string,
  { fetcher = fetch as Fetcher }: { fetcher?: Fetcher } = {},
): Promise<{ copied: number; failed: string[] }> {
  const { ref, submission } = await loadSubmission(id);
  const config = imageKitConfig();
  if (!config) throw new ContentError("Image uploads are not configured.", "invalid");
  const images = [...(submission.payload.images ?? [])];
  const failed: string[] = [];
  for (const link of submission.rawImageLinks) {
    const fileId = driveFileId(link);
    try {
      if (!fileId) throw new Error("not a Google Drive link");
      const response = await fetcher(`https://drive.google.com/uc?export=download&id=${encodeURIComponent(fileId)}`, {
        signal: AbortSignal.timeout(20_000),
      } as RequestInit);
      if (!response.ok) throw new Error(`Drive answered ${response.status}`);
      const type = response.headers.get("content-type")?.split(";")[0] ?? "";
      const file = new File(
        [new Uint8Array(await response.arrayBuffer())],
        `${fileId}.${type.split("/")[1] ?? "img"}`,
        { type },
      );
      const uploaded = await uploadToImageKit(
        file,
        uploadFolder("showcase", submission.payload.edition ?? new Date().getFullYear()),
        config,
        fetcher,
      );
      images.push({ url: uploaded.url, alt: submission.payload.title, width: uploaded.width, height: uploaded.height });
    } catch {
      failed.push(link);
    }
  }
  await ref.update({
    payload: toFirestore({ ...submission.payload, images: images.slice(0, 5) }),
    rawImageLinks: failed,
  });
  return { copied: images.length - (submission.payload.images?.length ?? 0), failed };
}
