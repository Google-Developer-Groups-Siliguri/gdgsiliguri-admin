export type ContentIssue = { path: (string | number)[]; message: string };

export class ContentError extends Error {
  constructor(
    message: string,
    readonly code:
      | "not_imported"
      | "stale_version"
      | "publish_in_progress"
      | "invalid"
      | "empty_section"
      | "not_toggleable"
      | "revision_missing"
      | "partial_publish",
    readonly issues: ContentIssue[] = [],
  ) {
    super(message);
    this.name = "ContentError";
  }
}
