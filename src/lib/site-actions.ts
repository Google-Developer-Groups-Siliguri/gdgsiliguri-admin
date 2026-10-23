"use server";

import { refresh } from "next/cache";

import { AdminError, addAdmin, changeRole, removeAdmin } from "@/lib/admins/repository";
import { isRole, type Role } from "@/lib/auth/roles";
import { AuthorizationError, requireAdmin } from "@/lib/auth/session";
import { markRebuilt, RebuildError, triggerRebuild } from "@/lib/settings";

export type SimpleResult = { ok: true } | { ok: false; message: string };

function failure(error: unknown): SimpleResult {
  if (error instanceof AdminError || error instanceof RebuildError || error instanceof AuthorizationError) {
    return { ok: false, message: error.message };
  }
  console.error(error);
  return { ok: false, message: "Something went wrong. Try again." };
}

async function run(role: Role, task: (actor: { email: string }) => Promise<void>): Promise<SimpleResult> {
  try {
    const actor = await requireAdmin(role);
    await task(actor);
    refresh();
    return { ok: true };
  } catch (error) {
    return failure(error);
  }
}

export async function addAdminAction(email: string, role: Role): Promise<SimpleResult> {
  if (typeof email !== "string" || !isRole(role)) return { ok: false, message: "Invalid request." };
  return run("owner", (actor) => addAdmin(email, role, actor));
}

export async function changeRoleAction(email: string, role: Role): Promise<SimpleResult> {
  if (typeof email !== "string" || !isRole(role)) return { ok: false, message: "Invalid request." };
  return run("owner", (actor) => changeRole(email, role, actor));
}

export async function removeAdminAction(email: string): Promise<SimpleResult> {
  if (typeof email !== "string") return { ok: false, message: "Invalid request." };
  return run("owner", (actor) => removeAdmin(email, actor));
}

export async function triggerRebuildAction(): Promise<SimpleResult> {
  return run("editor", triggerRebuild);
}

export async function markRebuiltAction(): Promise<SimpleResult> {
  return run("editor", markRebuilt);
}
