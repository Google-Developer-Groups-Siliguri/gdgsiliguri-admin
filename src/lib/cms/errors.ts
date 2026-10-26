export type ContentIssue = { path: (string | number)[]; message: string };

export type ContentErrorCode =
  | "unknown_section"
  | "not_imported"
  | "stale_version"
  | "stale_draft"
  | "publish_in_progress"
  | "invalid"
  | "owner_has_draft"
  | "bundle_too_large"
  | "too_many_writes"
  | "revision_missing"
  | "not_toggleable"
  | "already_exists";

export type PublishWarning = "legacy_sync_pending";

export class ContentError extends Error {
  constructor(
    message: string,
    readonly code: ContentErrorCode,
    readonly issues: ContentIssue[] = [],
  ) {
    super(message);
    this.name = "ContentError";
  }
}

export function issuesFrom(error: { issues: { path: PropertyKey[]; message: string }[] }): ContentIssue[] {
  return error.issues.map((issue) => ({
    path: issue.path.filter((part): part is string | number => typeof part !== "symbol"),
    message: issue.message,
  }));
}
