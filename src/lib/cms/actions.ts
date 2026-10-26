"use server";

import { refresh } from "next/cache";

import { AuthorizationError, requireAdmin } from "@/lib/auth/session";
import type { Role } from "@/lib/auth/roles";
import { isSectionId, parseSectionId } from "@/lib/sections/registry";

import { ContentError, type ContentErrorCode, type ContentIssue, type PublishWarning } from "./errors";
import { publish, toggleSection } from "./publish";
import {
  discardDraft,
  getRevision,
  listRevisions,
  revertToRevision,
  saveDraft,
  type RevisionSummary,
  type SectionState,
} from "./repository";
import { syncLegacy, type SyncResult } from "./sync";

export type ActionFailure = {
  ok: false;
  code: ContentErrorCode | AuthorizationError["reason"] | "bad_request" | "unexpected";
  message: string;
  issues?: ContentIssue[];
};

export type ActionResult<T> = { ok: true; data: T } | ActionFailure;

export type PublishActionData = { state: SectionState; warnings: PublishWarning[] };

function failure(error: unknown): ActionFailure {
  if (error instanceof ContentError)
    return { ok: false, code: error.code, message: error.message, issues: error.issues };
  if (error instanceof AuthorizationError) return { ok: false, code: error.reason, message: error.message };
  console.error(error);
  return { ok: false, code: "unexpected", message: "Something went wrong. Try again." };
}

function badRequest(message: string): ActionFailure {
  return { ok: false, code: "bad_request", message };
}

function roleFor(sectionId: string): Role {
  return parseSectionId(sectionId).type === "site-app" ? "owner" : "editor";
}

function validVersion(version: unknown): version is number {
  return Number.isInteger(version) && (version as number) > 0;
}

async function run<T>(sectionId: unknown, task: (actor: { email: string }) => Promise<T>): Promise<ActionResult<T>> {
  if (!isSectionId(sectionId)) return badRequest("Unknown section.");
  try {
    const actor = await requireAdmin(roleFor(sectionId));
    const data = await task(actor);
    refresh();
    return { ok: true, data };
  } catch (error) {
    return failure(error);
  }
}

export async function saveDraftAction(
  sectionId: string,
  draft: unknown,
  expectedDraftVersion: number,
): Promise<ActionResult<SectionState>> {
  if (!validVersion(expectedDraftVersion)) return badRequest("Missing draft version.");
  return run(sectionId, (actor) => saveDraft(sectionId, draft, expectedDraftVersion, actor));
}

export async function publishAction(
  sectionId: string,
  expectedVersion: number,
  note?: string,
): Promise<ActionResult<PublishActionData>> {
  if (!validVersion(expectedVersion)) return badRequest("Missing section version.");
  return run(sectionId, async (actor) => {
    const result = await publish(sectionId, expectedVersion, actor, { note: note?.trim() || undefined });
    return { state: result.state, warnings: result.warnings };
  });
}

export async function toggleAction(sectionId: string, enabled: boolean): Promise<ActionResult<PublishActionData>> {
  if (typeof enabled !== "boolean") return badRequest("Invalid toggle request.");
  return run(sectionId, async (actor) => {
    const result = await toggleSection(sectionId, enabled, actor);
    return { state: result.state, warnings: result.warnings };
  });
}

export async function discardDraftAction(sectionId: string): Promise<ActionResult<SectionState>> {
  return run(sectionId, (actor) => discardDraft(sectionId, actor));
}

export async function listRevisionsAction(sectionId: string): Promise<ActionResult<RevisionSummary[]>> {
  return run(sectionId, () => listRevisions(sectionId, 30));
}

export async function getRevisionAction(
  sectionId: string,
  revisionId: string,
): Promise<ActionResult<Record<string, unknown>>> {
  if (typeof revisionId !== "string") return badRequest("Unknown revision.");
  return run(sectionId, () => getRevision(sectionId, revisionId));
}

export async function revertAction(sectionId: string, revisionId: string): Promise<ActionResult<SectionState>> {
  if (typeof revisionId !== "string") return badRequest("Unknown revision.");
  return run(sectionId, (actor) => revertToRevision(sectionId, revisionId, actor));
}

export async function retryLegacySyncAction(): Promise<ActionResult<SyncResult>> {
  try {
    const actor = await requireAdmin("editor");
    const result = await syncLegacy("pending", actor);
    refresh();
    return { ok: true, data: result };
  } catch (error) {
    return failure(error);
  }
}
