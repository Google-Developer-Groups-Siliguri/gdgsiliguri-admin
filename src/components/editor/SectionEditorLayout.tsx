"use client";

import { useState, type ReactNode } from "react";

import { Button } from "@/components/m3/Button";
import { Card } from "@/components/m3/Card";
import { Icon } from "@/components/m3/Icon";
import { SectionHeader } from "@/components/section/SectionHeader";
import type { ContentIssue } from "@/lib/cms/errors";

import type { SectionEditor } from "./useSectionEditor";
import { UnsavedChangesBar } from "./UnsavedChangesBar";
import { UnsavedChangesGuard } from "./UnsavedChangesGuard";

type IssueListProps = {
  issues: ContentIssue[];
  describe: (path: (string | number)[]) => string;
  tone: "error" | "warning";
  onSelect?: (path: (string | number)[]) => void;
};

const VISIBLE_ISSUES = 6;

function IssueList({ issues, describe, tone, onSelect }: IssueListProps) {
  const [expanded, setExpanded] = useState(false);
  const shown = expanded ? issues : issues.slice(0, VISIBLE_ISSUES);
  const error = tone === "error";
  return (
    <Card
      variant="tinted"
      role={error ? "alert" : "status"}
      className={
        error
          ? "flex flex-col gap-2 bg-error-container p-4 text-on-error-container"
          : "flex flex-col gap-2 bg-tertiary-container p-4 text-on-tertiary-container"
      }
    >
      <span className="flex items-center gap-2 text-title-small">
        <Icon name={error ? "error" : "warning"} size={20} filled />
        {error
          ? `${issues.length} ${issues.length === 1 ? "problem" : "problems"} to fix before publishing`
          : `${issues.length} ${issues.length === 1 ? "thing" : "things"} to check`}
      </span>
      <ul className="flex flex-col gap-1 ps-7 text-body-medium">
        {shown.map((issue, index) => (
          <li key={`${issue.path.join(".")}-${index}`}>
            {onSelect ? (
              <button
                type="button"
                onClick={() => onSelect(issue.path)}
                className="focus-ring cursor-pointer rounded-xs text-start underline-offset-2 hover:underline"
              >
                <span className="font-medium">{describe(issue.path)}</span>: {issue.message}
              </button>
            ) : (
              <>
                <span className="font-medium">{describe(issue.path)}</span>: {issue.message}
              </>
            )}
          </li>
        ))}
      </ul>
      {issues.length > VISIBLE_ISSUES && (
        <div className="ps-4">
          <Button variant="text" className="text-inherit" onClick={() => setExpanded((value) => !value)}>
            {expanded ? "Show fewer" : `Show all ${issues.length}`}
          </Button>
        </div>
      )}
    </Card>
  );
}

type SectionEditorLayoutProps = {
  editor: SectionEditor;
  describePath: (path: (string | number)[]) => string;
  onSelectIssue?: (path: (string | number)[]) => void;
  children: ReactNode;
};

export function SectionEditorLayout({ editor, describePath, onSelectIssue, children }: SectionEditorLayoutProps) {
  return (
    <div className="flex flex-col gap-4">
      <SectionHeader {...editor.headerProps} />
      {editor.errors.length > 0 && (
        <IssueList issues={editor.errors} describe={describePath} tone="error" onSelect={onSelectIssue} />
      )}
      {editor.warnings.length > 0 && (
        <IssueList issues={editor.warnings} describe={describePath} tone="warning" onSelect={onSelectIssue} />
      )}
      {children}
      <UnsavedChangesGuard when={editor.dirty} />
      <UnsavedChangesBar
        dirty={editor.dirty}
        hasDraftChanges={editor.headerProps.hasDraftChanges}
        busy={editor.busy}
        canPublish={editor.canPublish}
        onPublish={editor.headerProps.onPublish}
        onDiscard={editor.headerProps.onDiscard}
      />
    </div>
  );
}
