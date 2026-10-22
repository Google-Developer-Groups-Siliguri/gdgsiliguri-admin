"use server";

import { refresh } from "next/cache";

import { AuthorizationError, requireAdmin } from "@/lib/auth/session";

import { ContentError, type ContentIssue } from "./errors";
import {
  discardDraft,
  getRevision,
  listRevisions,
  publish,
  revertToRevision,
  saveDraft,
  toggleEnabled,
  type RevisionSummary,
  type SectionState,
} from "./repository";
import type { SectionValues } from "./schemas";
import { isSectionKey, type SectionKey } from "./sections";

export type ActionFailure = {
  ok: false;
  code: ContentError["code"] | AuthorizationError["reason"] | "bad_request" | "unexpected";
  message: string;
  issues?: ContentIssue[];
};

export type ActionResult<T> = { ok: true; data: T } | ActionFailure;

function failure(error: unknown): ActionFailure {
  if (error instanceof ContentError) {
    return { ok: false, code: error.code, message: error.message, issues: error.issues };
  }
  if (error instanceof AuthorizationError) {
    return { ok: false, code: error.reason, message: error.message };
  }
  console.error(error);
  return { ok: false, code: "unexpected", message: "Something went wrong. Try again." };
}

function badRequest(message: string): ActionFailure {
  return { ok: false, code: "bad_request", message };
}

function checkKey(key: unknown): key is SectionKey {
  return isSectionKey(key);
}

function checkVersion(version: unknown): version is number {
  return Number.isInteger(version) && (version as number) > 0;
}

export async function saveDraftAction(
  key: SectionKey,
  draft: unknown,
): Promise<ActionResult<SectionState>> {
  if (!checkKey(key)) return badRequest("Unknown section.");
  try {
    const actor = await requireAdmin();
    const state = await saveDraft(key, draft, actor);
    refresh();
    return { ok: true, data: state };
  } catch (error) {
    return failure(error);
  }
}

export async function publishAction(
  key: SectionKey,
  expectedVersion: number,
  note?: string,
): Promise<ActionResult<SectionState>> {
  if (!checkKey(key)) return badRequest("Unknown section.");
  if (!checkVersion(expectedVersion)) return badRequest("Missing section version.");
  try {
    const actor = await requireAdmin();
    const state = await publish(key, expectedVersion, actor, note?.trim() || undefined);
    refresh();
    return { ok: true, data: state };
  } catch (error) {
    return failure(error);
  }
}

export async function toggleAction(
  key: SectionKey,
  enabled: boolean,
  expectedVersion: number,
): Promise<ActionResult<SectionState>> {
  if (!checkKey(key)) return badRequest("Unknown section.");
  if (typeof enabled !== "boolean" || !checkVersion(expectedVersion)) {
    return badRequest("Invalid toggle request.");
  }
  try {
    const actor = await requireAdmin();
    const state = await toggleEnabled(key, enabled, expectedVersion, actor);
    refresh();
    return { ok: true, data: state };
  } catch (error) {
    return failure(error);
  }
}

export async function discardDraftAction(key: SectionKey): Promise<ActionResult<SectionState>> {
  if (!checkKey(key)) return badRequest("Unknown section.");
  try {
    const actor = await requireAdmin();
    const state = await discardDraft(key, actor);
    refresh();
    return { ok: true, data: state };
  } catch (error) {
    return failure(error);
  }
}

export async function listRevisionsAction(
  key: SectionKey,
): Promise<ActionResult<RevisionSummary[]>> {
  if (!checkKey(key)) return badRequest("Unknown section.");
  try {
    await requireAdmin();
    return { ok: true, data: await listRevisions(key, 30) };
  } catch (error) {
    return failure(error);
  }
}

export async function getRevisionAction<K extends SectionKey>(
  key: K,
  revisionId: string,
): Promise<ActionResult<SectionValues[K]>> {
  if (!checkKey(key) || typeof revisionId !== "string") return badRequest("Unknown revision.");
  try {
    await requireAdmin();
    return { ok: true, data: await getRevision(key, revisionId) };
  } catch (error) {
    return failure(error);
  }
}

export async function revertAction(
  key: SectionKey,
  revisionId: string,
): Promise<ActionResult<SectionState>> {
  if (!checkKey(key) || typeof revisionId !== "string") return badRequest("Unknown revision.");
  try {
    const actor = await requireAdmin();
    const state = await revertToRevision(key, revisionId, actor);
    refresh();
    return { ok: true, data: state };
  } catch (error) {
    return failure(error);
  }
}
