import type { ContentIssue } from "@/lib/cms/errors";

export type PathPart = string | number;

export function startsWith(path: PathPart[], prefix: PathPart[]): boolean {
  return prefix.every((part, index) => path[index] === part);
}

export function issuesUnder(issues: ContentIssue[], prefix: PathPart[]): ContentIssue[] {
  return issues
    .filter((issue) => startsWith(issue.path, prefix))
    .map((issue) => ({ ...issue, path: issue.path.slice(prefix.length) }));
}

export function messageFor(issues: ContentIssue[], field: PathPart): string | undefined {
  return issues.find((issue) => issue.path.length === 1 && issue.path[0] === field)?.message;
}

export function fieldMessages(issues: ContentIssue[]): Record<string, string> {
  const messages: Record<string, string> = {};
  for (const issue of issues) {
    const key = issue.path.join(".");
    if (!(key in messages)) messages[key] = issue.message;
  }
  return messages;
}

export type ItemIssues = { errors: ContentIssue[]; warnings: ContentIssue[] };

export function itemIssues(
  errors: ContentIssue[],
  warnings: ContentIssue[],
  prefix: PathPart[],
): ItemIssues {
  return { errors: issuesUnder(errors, prefix), warnings: issuesUnder(warnings, prefix) };
}
