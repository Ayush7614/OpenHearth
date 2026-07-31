import {
  repoFullNameFromUrl,
  searchIssuesAll,
  type SearchIssueItem,
} from "../api/github";
import {
  buildSearchQuery,
  rangeDayCount,
  splitRange,
  type AuditKind,
  type DateRange,
} from "./queries";

export type ContributionItem = {
  id: number;
  number: number;
  title: string;
  url: string;
  state: "open" | "merged" | "closed";
  createdAt: string;
  closedAt: string | null;
  repo: string;
};

export type RepoBucket = {
  repo: string;
  open: number;
  merged: number;
  closed: number;
  items: ContributionItem[];
};

export type AuditResult = {
  kind: AuditKind;
  username: string;
  range: DateRange;
  total: number;
  repos: RepoBucket[];
  items: ContributionItem[];
};

function classifyState(item: SearchIssueItem, kind: AuditKind): ContributionItem["state"] {
  if (kind === "pr" || kind === "review") {
    if (item.pull_request?.merged_at) return "merged";
    if (item.state === "open") return "open";
    return "closed";
  }
  return item.state === "open" ? "open" : "closed";
}

export function toContribution(item: SearchIssueItem, kind: AuditKind): ContributionItem {
  return {
    id: item.id,
    number: item.number,
    title: item.title,
    url: item.html_url,
    state: classifyState(item, kind),
    createdAt: item.created_at,
    closedAt: item.closed_at,
    repo: repoFullNameFromUrl(item.repository_url),
  };
}

export function aggregateByRepo(items: ContributionItem[]): RepoBucket[] {
  const map = new Map<string, RepoBucket>();

  for (const item of items) {
    let bucket = map.get(item.repo);
    if (!bucket) {
      bucket = { repo: item.repo, open: 0, merged: 0, closed: 0, items: [] };
      map.set(item.repo, bucket);
    }
    bucket.items.push(item);
    if (item.state === "open") bucket.open++;
    else if (item.state === "merged") bucket.merged++;
    else bucket.closed++;
  }

  return [...map.values()].sort((a, b) => b.items.length - a.items.length);
}

/**
 * Fetch all search results for a kind+range, recursively splitting
 * the date window when GitHub's 1000-result search cap would truncate.
 */
export async function fetchAllForRange(
  username: string,
  kind: AuditKind,
  range: DateRange,
  onProgress?: (message: string) => void
): Promise<SearchIssueItem[]> {
  const query = buildSearchQuery(username, kind, range);
  onProgress?.(`Searching: ${query}`);

  const { items, total_count } = await searchIssuesAll(query, (fetched, capped) => {
    onProgress?.(`Fetched ${fetched} / ${capped}`);
  });

  if (total_count <= 1000) {
    return items;
  }

  // Over the hard cap — split the range and recurse (need at least 2 days)
  if (rangeDayCount(range) < 2) {
    onProgress?.(
      `Warning: ${total_count} results in a single day; only first 1000 returned for ${range.from}`
    );
    return items;
  }

  const [left, right] = splitRange(range);
  onProgress?.(
    `Over 1000 results (${total_count}). Splitting ${range.from}..${range.to}`
  );

  const leftItems = await fetchAllForRange(username, kind, left, onProgress);
  const rightItems = await fetchAllForRange(username, kind, right, onProgress);

  const seen = new Set<number>();
  const merged: SearchIssueItem[] = [];
  for (const item of [...leftItems, ...rightItems]) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    merged.push(item);
  }
  return merged;
}

export async function runAudit(
  username: string,
  kind: AuditKind,
  range: DateRange,
  onProgress?: (message: string) => void
): Promise<AuditResult> {
  const raw = await fetchAllForRange(username, kind, range, onProgress);
  const items = raw.map((i) => toContribution(i, kind));
  items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const repos = aggregateByRepo(items);

  return {
    kind,
    username,
    range,
    total: items.length,
    repos,
    items,
  };
}
