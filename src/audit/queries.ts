export type DateRange = {
  from: string; // YYYY-MM-DD
  to: string; // YYYY-MM-DD
};

export type AuditKind = "pr" | "issue" | "review";

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

export function formatDate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function monthRange(year: number, month: number): DateRange {
  const from = new Date(year, month - 1, 1);
  const to = new Date(year, month, 0); // last day of month
  return { from: formatDate(from), to: formatDate(to) };
}

export function buildSearchQuery(
  username: string,
  kind: AuditKind,
  range: DateRange
): string {
  const created = `created:${range.from}..${range.to}`;
  switch (kind) {
    case "pr":
      return `author:${username} is:pr ${created}`;
    case "issue":
      return `author:${username} is:issue ${created}`;
    case "review":
      return `reviewed-by:${username} is:pr ${created}`;
  }
}

/** Split a date range into halves (inclusive calendar days). */
export function splitRange(range: DateRange): [DateRange, DateRange] {
  const start = new Date(range.from + "T00:00:00");
  const end = new Date(range.to + "T00:00:00");
  const midMs = start.getTime() + Math.floor((end.getTime() - start.getTime()) / 2);
  const mid = new Date(midMs);
  const midNext = new Date(mid);
  midNext.setDate(midNext.getDate() + 1);

  return [
    { from: formatDate(start), to: formatDate(mid) },
    { from: formatDate(midNext), to: formatDate(end) },
  ];
}

export function rangeDayCount(range: DateRange): number {
  const start = new Date(range.from + "T00:00:00");
  const end = new Date(range.to + "T00:00:00");
  return Math.round((end.getTime() - start.getTime()) / 86400000) + 1;
}
