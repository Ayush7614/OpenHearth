export type DateRange = {
  from: string;
  to: string;
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
  const to = new Date(year, month, 0);
  return { from: formatDate(from), to: formatDate(to) };
}

export function parseMonth(value: string): DateRange {
  const match = /^(\d{4})-(\d{2})$/.exec(value.trim());
  if (!match) {
    throw new Error(`Invalid month "${value}". Use YYYY-MM (e.g. 2026-07).`);
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (month < 1 || month > 12) {
    throw new Error(`Invalid month "${value}". Month must be 01–12.`);
  }
  return monthRange(year, month);
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
