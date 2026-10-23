"use client";

import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState, useTransition } from "react";

import { useSnackbar } from "@/components/m3/Snackbar";
import {
  discardDraftAction,
  publishAction,
  saveDraftAction,
  type ActionFailure,
} from "@/lib/content/actions";
import { ContentError, type ContentIssue } from "@/lib/content/errors";
import type { SectionState } from "@/lib/content/repository";
import { toRtdbValue } from "@/lib/content/rtdb-value";
import type { SectionValues } from "@/lib/content/schemas";
import { isEnabled, SECTIONS, validateForPublish, type SectionKey } from "@/lib/content/sections";
import { sectionWarnings, type WarningContext } from "@/lib/content/warnings";
import { deepEqual } from "@/lib/deep-equal";

type Busy = "save" | "publish" | "discard" | null;

function syncKey(state: SectionState): string {
  return `${state.version}|${state.draftUpdatedAt ?? ""}|${state.publishedAt ?? ""}`;
}

function isNewer(candidate: SectionState, base: SectionState): boolean {
  if (candidate.version !== base.version) return candidate.version > base.version;
  return (candidate.draftUpdatedAt ?? "") > (base.draftUpdatedAt ?? "");
}

function strictIssues(key: SectionKey, draft: unknown): ContentIssue[] {
  const result = validateForPublish(key, draft);
  if (result.success) return [];
  return result.error.issues.map((issue) => ({
    path: issue.path.filter((part): part is string | number => typeof part !== "symbol"),
    message: issue.message,
  }));
}

function emptyProblem(key: SectionKey, draft: unknown): string | null {
  try {
    toRtdbValue(key, draft);
    return null;
  } catch (error) {
    return error instanceof ContentError ? error.message : null;
  }
}

export function useSectionEditor<K extends SectionKey>(
  serverState: SectionState<K>,
  context: WarningContext = {},
) {
  const key = serverState.key;
  const [latest, setLatest] = useState<SectionState<K> | null>(null);
  const state = latest && isNewer(latest, serverState) ? latest : serverState;
  const showSnackbar = useSnackbar();
  const router = useRouter();
  const [draft, setDraftState] = useState<SectionValues[K]>(state.draft);
  const [synced, setSynced] = useState({ key: syncKey(state), draft: state.draft });
  const [busy, setBusy] = useState<Busy>(null);
  const [serverIssues, setServerIssues] = useState<ContentIssue[]>([]);
  const [, startTransition] = useTransition();

  if (synced.key !== syncKey(state)) {
    const hadLocalChanges = !deepEqual(draft, synced.draft);
    setSynced({ key: syncKey(state), draft: state.draft });
    if (!hadLocalChanges || deepEqual(draft, state.draft)) setDraftState(state.draft);
  }

  const dirty = !deepEqual(draft, state.draft);
  const errors = useMemo(() => strictIssues(key, draft), [key, draft]);
  const speakers = context.speakers;
  const warnings = useMemo(() => sectionWarnings(key, draft, { speakers }), [key, draft, speakers]);
  const emptyMessage = useMemo(() => emptyProblem(key, draft), [key, draft]);

  const setDraft = useCallback((next: SectionValues[K] | ((current: SectionValues[K]) => SectionValues[K])) => {
    setServerIssues([]);
    setDraftState(next);
  }, []);

  function fail(result: ActionFailure) {
    if (result.issues?.length) setServerIssues(result.issues);
    showSnackbar({
      message:
        result.code === "stale_version"
          ? "Someone else published this section. Reload the page to see their changes."
          : result.message,
      tone: "error",
      ...(result.code === "stale_version"
        ? { actionLabel: "Reload", onAction: () => window.location.reload() }
        : {}),
    });
  }

  async function saveNow(): Promise<boolean> {
    const result = await saveDraftAction(key, draft);
    if (!result.ok) {
      fail(result);
      return false;
    }
    setLatest(result.data as SectionState<K>);
    return true;
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
      if (dirty && !(await saveNow())) {
        setBusy(null);
        return;
      }
      const result = await publishAction(key, state.version, note);
      setBusy(null);
      if (!result.ok) {
        fail(result);
        return;
      }
      setLatest(result.data as SectionState<K>);
      setServerIssues([]);
      showSnackbar({
        message: `${SECTIONS[key].label} published. Rebuild the website to show it.`,
        actionLabel: "Rebuild",
        onAction: () => router.push("/settings/rebuild"),
        duration: 10_000,
      });
    });
  }

  function discard() {
    setBusy("discard");
    startTransition(async () => {
      const result = await discardDraftAction(key);
      setBusy(null);
      if (!result.ok) {
        fail(result);
        return;
      }
      setLatest(result.data as SectionState<K>);
      setDraftState(result.data.draft as SectionValues[K]);
      setServerIssues([]);
      showSnackbar({ message: "Draft discarded." });
    });
  }

  const allErrors = serverIssues.length ? serverIssues : errors;
  const errorPaths = new Set(allErrors.map((issue) => issue.path.join(".")));
  const distinctWarnings = warnings.filter((issue) => !errorPaths.has(issue.path.join(".")));

  return {
    key,
    draft,
    setDraft,
    dirty,
    busy,
    errors: allErrors,
    warnings: distinctWarnings,
    emptyMessage,
    canPublish: allErrors.length === 0 && emptyMessage === null,
    save,
    publish,
    discard,
    headerProps: {
      sectionKey: key,
      version: state.version,
      publishedEnabled: isEnabled(key, state.published),
      hasDraftChanges: state.hasDraftChanges,
      dirty,
      publishedAt: state.publishedAt,
      publishedBy: state.publishedBy,
      busy,
      canPublish: allErrors.length === 0 && emptyMessage === null,
      onSave: save,
      onPublish: () => publish(),
      onDiscard: () => {
        if (state.hasDraftChanges) discard();
        else setDraftState(state.draft);
      },
    },
  };
}

export type SectionEditor<K extends SectionKey> = ReturnType<typeof useSectionEditor<K>>;
