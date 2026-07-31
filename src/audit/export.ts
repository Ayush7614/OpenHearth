import type { AuditResult, ContributionItem } from "./aggregate";
import { EXPORT_PREFIX } from "../lib/brand";

function downloadBlob(filename: string, blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function escapeCsv(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function exportJson(result: AuditResult): void {
  const payload = {
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
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json",
  });
  downloadBlob(
    `${EXPORT_PREFIX}-${result.kind}-${result.username}-${result.range.from}_${result.range.to}.json`,
    blob
  );
}

export function exportCsv(result: AuditResult): void {
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
  const csv = [header.join(","), ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  downloadBlob(
    `${EXPORT_PREFIX}-${result.kind}-${result.username}-${result.range.from}_${result.range.to}.csv`,
    blob
  );
}
