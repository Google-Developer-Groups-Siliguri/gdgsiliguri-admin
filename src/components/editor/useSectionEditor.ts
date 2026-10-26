"use client";

import { useCallback, useMemo, useState, useTransition } from "react";

import { useSnackbar } from "@/components/m3/Snackbar";
import { useSectionDef } from "@/components/registry/RegistryProvider";
import { discardDraftAction, publishAction, saveDraftAction, type ActionFailure } from "@/lib/cms/actions";
import type { ContentIssue } from "@/lib/cms/errors";
import type { Visibility } from "@/lib/cms/queries";
import type { SectionState } from "@/lib/cms/repository";
import { deepEqual } from "@/lib/deep-equal";
import { stripEmpty } from "@/lib/schema/v2/clean";
import type { SectionDef } from "@/lib/sections/registry";

type Doc = Record<string, unknown>;
type Busy = "save" | "publish" | "discard" | null;

function syncKey(state: SectionState): string {
  return `${state.version}|${state.draftVersion}`;
}

function isNewer(candidate: SectionState, base: SectionState): boolean {
  if (candidate.version !== base.version) return candidate.version > base.version;
  return candidate.draftVersion > base.draftVersion;
}

function awaitingId(draft: unknown, path: (string | number)[]): boolean {
  if (path.length !== 3 || path[0] !== "items" || path[2] !== "id" || typeof path[1] !== "number") return false;
  const items = (draft as { items?: { id?: string }[] }).items;
  return !items?.[path[1]]?.id;
}

export function strictIssues(def: SectionDef, draft: unknown): ContentIssue[] {
  const result = def.schema.strict.safeParse(stripEmpty(draft));
  if (result.success) return [];
  return result.error.issues
    .map((issue) => ({
      path: issue.path.filter((part): part is string | number => typeof part !== "symbol"),
      message: issue.message,
    }))
    .filter((issue) => !awaitingId(draft, issue.path));
}

type EditorOptions<T> = { warnings?: (draft: T) => ContentIssue[]; visibility?: Visibility };

export function useSectionEditor<T extends Doc>(serverState: SectionState<T>, options: EditorOptions<T> = {}) {
  const def = useSectionDef(serverState.id);
  const [latest, setLatest] = useState<SectionState<T> | null>(null);
  const state = latest && isNewer(latest, serverState) ? latest : serverState;
  const showSnackbar = useSnackbar();
  const [draft, setDraftState] = useState<T>(state.draft);
  const [synced, setSynced] = useState({ key: syncKey(state), draft: state.draft });
  const [busy, setBusy] = useState<Busy>(null);
  const [serverIssues, setServerIssues] = useState<ContentIssue[]>([]);
  const [, startTransition] = useTransition();

  const shown = options.visibility?.enabled ?? null;
  const [seenShown, setSeenShown] = useState(shown);
  if (seenShown !== shown) {
    setSeenShown(shown);
    setServerIssues([]);
  }

  if (synced.key !== syncKey(state)) {
    const hadLocalChanges = !deepEqual(draft, synced.draft);
    setSynced({ key: syncKey(state), draft: state.draft });
    if (!hadLocalChanges || deepEqual(draft, state.draft)) setDraftState(state.draft);
  }

  const dirty = !deepEqual(draft, state.draft);
  const errors = useMemo(() => strictIssues(def, draft), [def, draft]);
  const { warnings: warn } = options;
  const warnings = useMemo(() => warn?.(draft) ?? [], [warn, draft]);

  const setDraft = useCallback((next: T | ((current: T) => T)) => {
    setServerIssues([]);
    setDraftState(next);
  }, []);

  function fail(result: ActionFailure) {
    if (result.issues?.length) setServerIssues(result.issues);
    const stale = result.code === "stale_version" || result.code === "stale_draft";
    showSnackbar({
      message: stale ? "Someone else changed this section. Reload the page to see their changes." : result.message,
      tone: "error",
      ...(stale ? { actionLabel: "Reload", onAction: () => window.location.reload() } : {}),
    });
  }

  async function saveNow(): Promise<SectionState<T> | null> {
    const result = await saveDraftAction(def.id, draft, state.draftVersion);
    if (!result.ok) {
      fail(result);
      return null;
    }
    const saved = result.data as SectionState<T>;
    setLatest(saved);
    return saved;
  }

  function save() {
    setBusy("save");
    startTransition(async () => {
      if (await saveNow()) showSnackbar({ message: "Draft saved. The live site is unchanged." });
      setBusy(null);
    });
  }

  function publish(note?: string) {
    setBusy("publish");
    startTransition(async () => {
      const saved = dirty ? await saveNow() : state;
      if (!saved) {
        setBusy(null);
        return;
      }
      const result = await publishAction(def.id, saved.version, note);
      setBusy(null);
      if (!result.ok) {
        fail(result);
        return;
      }
      setLatest(result.data.state as SectionState<T>);
      setServerIssues([]);
      const pending = result.data.warnings.includes("legacy_sync_pending");
      showSnackbar({
        message: pending
          ? `${def.label} published. The copy for older app versions will update shortly.`
          : `${def.label} published. It's live on gdgsiliguri.com.`,
        duration: 10_000,
      });
    });
  }

  function discard() {
    setBusy("discard");
    startTransition(async () => {
      const result = await discardDraftAction(def.id);
      setBusy(null);
      if (!result.ok) {
        fail(result);
        return;
      }
      setLatest(result.data as SectionState<T>);
      setDraftState(result.data.draft as T);
      setServerIssues([]);
      showSnackbar({ message: "Draft discarded." });
    });
  }

  const allErrors = serverIssues.length ? serverIssues : errors;
  const errorPaths = new Set(allErrors.map((issue) => issue.path.join(".")));
  const distinctWarnings = warnings.filter((issue) => !errorPaths.has(issue.path.join(".")));
  const canPublish = allErrors.length === 0;

  return {
    def,
    state,
    draft,
    setDraft,
    dirty,
    busy,
    errors: allErrors,
    warnings: distinctWarnings,
    canPublish,
    save,
    publish,
    discard,
    headerProps: {
      sectionId: def.id,
      label: def.label,
      group: def.group,
      version: state.version,
      visibility: options.visibility ?? null,
      hasDraftChanges: state.hasDraftChanges,
      dirty,
      publishedAt: state.publishedAt,
      publishedBy: state.publishedBy,
      busy,
      canPublish,
      onSave: save,
      onPublish: () => publish(),
      onDiscard: () => {
        if (state.hasDraftChanges) discard();
        else setDraftState(state.draft);
      },
    },
  };
}

export type SectionEditor<T extends Doc = Doc> = ReturnType<typeof useSectionEditor<T>>;
