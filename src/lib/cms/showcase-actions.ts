"use server";

import { refresh } from "next/cache";

import { AuthorizationError, requireAdmin } from "@/lib/auth/session";
import type { Role } from "@/lib/auth/roles";

import { ContentError } from "./errors";
import {
  approveSubmission,
  copySubmissionImages,
  generateIngestSecret,
  hideSubmission,
  rejectSubmission,
  setAcceptingSubmissions,
  setShowcaseFeatured,
  updateSubmissionPayload,
} from "./showcase";

export type ShowcaseActionResult<T = null> = { ok: true; data: T } | { ok: false; message: string };

async function run<T>(role: Role, task: (actor: { email: string }) => Promise<T>): Promise<ShowcaseActionResult<T>> {
  try {
    const actor = await requireAdmin(role);
    const data = await task(actor);
    refresh();
    return { ok: true, data };
  } catch (error) {
    if (error instanceof ContentError) {
      const details = error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ");
      return { ok: false, message: details ? `${error.message} ${details}` : error.message };
    }
    if (error instanceof AuthorizationError) return { ok: false, message: error.message };
    console.error(error);
    return { ok: false, message: "Something went wrong. Try again." };
  }
}

const validId = (id: unknown): id is string => typeof id === "string" && /^[\w-]{1,100}$/.test(id);
const bad = { ok: false as const, message: "Invalid request." };

export async function saveSubmissionAction(id: string, payload: unknown) {
  if (!validId(id)) return bad;
  return run("editor", async () => {
    await updateSubmissionPayload(id, payload);
    return null;
  });
}

export async function approveSubmissionAction(id: string) {
  if (!validId(id)) return bad;
  return run("editor", (actor) => approveSubmission(id, actor));
}

export async function rejectSubmissionAction(id: string, note: string) {
  if (!validId(id) || typeof note !== "string") return bad;
  return run("editor", async (actor) => {
    await rejectSubmission(id, note, actor);
    return null;
  });
}

export async function hideSubmissionAction(id: string) {
  if (!validId(id)) return bad;
  return run("editor", async (actor) => {
    await hideSubmission(id, actor);
    return null;
  });
}

export async function featureShowcaseAction(showcaseId: string, featured: boolean) {
  if (!validId(showcaseId) || typeof featured !== "boolean") return bad;
  return run("editor", async (actor) => {
    await setShowcaseFeatured(showcaseId, featured, actor);
    return null;
  });
}

export async function copyImagesAction(id: string) {
  if (!validId(id)) return bad;
  return run("editor", () => copySubmissionImages(id));
}

export async function generateSecretAction() {
  return run("owner", (actor) => generateIngestSecret(actor));
}

export async function acceptingSubmissionsAction(accepting: boolean) {
  if (typeof accepting !== "boolean") return bad;
  return run("owner", async (actor) => {
    await setAcceptingSubmissions(accepting, actor);
    return null;
  });
}
