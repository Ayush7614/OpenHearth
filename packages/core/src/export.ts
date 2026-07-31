import type { AuditResult, ContributionItem } from "./aggregate.js";
import type { FullAuditResult } from "./insights.js";

function escapeCsv(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function auditToJson(result: AuditResult): string {
  return JSON.stringify(
    {
      username: result.username,
      kind: result.kind,
      range: result.range,
      total: result.total,
      repoCount: result.repos.length,
      repos: result.repos.map((r) => ({
        repo: r.repo,
        open: r.open,
        merged: r.merged,
        closed: r.closed,
        count: r.items.length,
      })),
      items: result.items,
    },
    null,
    2
  );
}

export function fullAuditToJson(result: FullAuditResult): string {
  return JSON.stringify(
    {
      username: result.username,
      range: result.range,
      insights: result.insights,
      pullRequests: {
        total: result.pullRequests.total,
        repos: result.pullRequests.repos.length,
      },
      issues: { total: result.issues.total, repos: result.issues.repos.length },
      reviews: { total: result.reviews.total, repos: result.reviews.repos.length },
      pullRequestsItems: result.pullRequests.items,
      issuesItems: result.issues.items,
      reviewsItems: result.reviews.items,
    },
    null,
    2
  );
}

export function auditToCsv(result: AuditResult): string {
  const header = ["repo", "number", "title", "state", "created_at", "closed_at", "url"];
  const rows = result.items.map((item: ContributionItem) =>
    [
      item.repo,
      String(item.number),
      item.title,
      item.state,
      item.createdAt,
      item.closedAt ?? "",
      item.url,
    ]
      .map(escapeCsv)
      .join(",")
  );
  return [header.join(","), ...rows].join("\n");
}

export function fullAuditToCsv(result: FullAuditResult): string {
  const header = ["kind", "repo", "number", "title", "state", "created_at", "closed_at", "url"];
  const rows: string[] = [];

  for (const [kind, audit] of [
    ["pr", result.pullRequests],
    ["issue", result.issues],
    ["review", result.reviews],
  ] as const) {
    for (const item of audit.items) {
      rows.push(
        [kind, item.repo, String(item.number), item.title, item.state, item.createdAt, item.closedAt ?? "", item.url]
          .map(escapeCsv)
          .join(",")
      );
    }
  }

  return [header.join(","), ...rows].join("\n");
}
