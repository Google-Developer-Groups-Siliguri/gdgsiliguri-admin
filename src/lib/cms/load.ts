import "server-only";

import { notFound } from "next/navigation";

import { ContentError } from "./errors";

export async function orNotFound<T>(load: Promise<T>): Promise<T> {
  try {
    return await load;
  } catch (error) {
    if (error instanceof ContentError && (error.code === "unknown_section" || error.code === "not_imported")) notFound();
    throw error;
  }
}

export function mergeItems<T extends { id: string }>(...lists: T[][]): T[] {
  const byId = new Map<string, T>();
  for (const list of lists) for (const item of list) if (item.id) byId.set(item.id, item);
  return [...byId.values()];
}
