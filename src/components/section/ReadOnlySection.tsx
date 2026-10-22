"use client";

import { useState } from "react";

import { Card } from "@/components/m3/Card";
import { List, ListItem } from "@/components/m3/List";
import { useSnackbar } from "@/components/m3/Snackbar";
import { discardDraftAction, publishAction } from "@/lib/content/actions";
import type { SectionState } from "@/lib/content/repository";
import { isEnabled } from "@/lib/content/sections";
import { summarizeItems } from "@/lib/content/summary";

import { ItemThumbnail } from "./ItemThumbnail";
import { SectionHeader } from "./SectionHeader";

export function ReadOnlySection({ state }: { state: SectionState }) {
  const showSnackbar = useSnackbar();
  const [busy, setBusy] = useState<"publish" | "discard" | null>(null);
  const items = summarizeItems(state.key, state.draft);

  async function run(kind: "publish" | "discard") {
    setBusy(kind);
    const result =
      kind === "publish"
        ? await publishAction(state.key, state.version)
        : await discardDraftAction(state.key);
    setBusy(null);
    if (!result.ok) {
      const count = result.issues?.length ?? 0;
      showSnackbar({
        message: count ? `${result.message} (${count} ${count === 1 ? "problem" : "problems"})` : result.message,
        tone: "error",
      });
      return;
    }
    showSnackbar({
      message: kind === "publish" ? "Published. The live site updates after a rebuild." : "Draft discarded.",
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <SectionHeader
        sectionKey={state.key}
        version={state.version}
        publishedEnabled={isEnabled(state.key, state.published)}
        hasDraftChanges={state.hasDraftChanges}
        dirty={false}
        publishedAt={state.publishedAt}
        publishedBy={state.publishedBy}
        busy={busy}
        onPublish={() => run("publish")}
        onDiscard={() => run("discard")}
      />
      {items.length > 0 ? (
        <Card variant="outlined" className="overflow-hidden">
          <List aria-label="Items">
            {items.map((item, index) => (
              <ListItem
                key={`${item.primary}-${index}`}
                leading={item.image !== undefined ? <ItemThumbnail src={item.image} /> : undefined}
                headline={item.primary || "Untitled"}
                supportingText={item.secondary}
              />
            ))}
          </List>
        </Card>
      ) : (
        <p className="text-body-medium text-on-surface-variant">No items yet.</p>
      )}
    </div>
  );
}
