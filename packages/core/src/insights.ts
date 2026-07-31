import { ACTIVITY_FEED_REPO_CAP } from "./github.js";
import type { AuditResult, ContributionItem } from "./aggregate.js";
import type { DateRange } from "./queries.js";

export type AuditInsights = {
  totalContributions: number;
  uniqueRepos: number;
  reposVisibleOnFeed: number;
  reposHiddenByFeed: number;
  feedTruncationNote: string;
  topRepos: { repo: string; count: number }[];
  busiestDay: string | null;
  mergeRate: number;
  byKind: { pr: number; issue: number; review: number };
};

export type FullAuditResult = {
  username: string;
  range: DateRange;
  pullRequests: AuditResult;
  issues: AuditResult;
  reviews: AuditResult;
  insights: AuditInsights;
};

function countByDay(items: ContributionItem[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const item of items) {
    const day = item.createdAt.slice(0, 10);
    map.set(day, (map.get(day) ?? 0) + 1);
  }
  return map;
}

function busiestDay(items: ContributionItem[]): string | null {
  const map = countByDay(items);
  let best: string | null = null;
  let bestCount = 0;
  for (const [day, count] of map) {
    if (count > bestCount) {
      best = day;
      bestCount = count;
    }
  }
  return best;
}

export function buildInsights(
  pr: AuditResult,
  issue: AuditResult,
  review: AuditResult
): AuditInsights {
  const allItems = [...pr.items, ...issue.items, ...review.items];
  const repoTotals = new Map<string, number>();

  for (const item of allItems) {
    repoTotals.set(item.repo, (repoTotals.get(item.repo) ?? 0) + 1);
  }

  const uniqueRepos = repoTotals.size;
  const reposHiddenByFeed = Math.max(0, uniqueRepos - ACTIVITY_FEED_REPO_CAP);
  const reposVisibleOnFeed = Math.min(uniqueRepos, ACTIVITY_FEED_REPO_CAP);

  const topRepos = [...repoTotals.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([repo, count]) => ({ repo, count }));

  const merged = pr.items.filter((i) => i.state === "merged").length;
  const mergeRate = pr.total > 0 ? Math.round((merged / pr.total) * 100) : 0;

  let feedTruncationNote = "Activity feed likely shows all repos for this range.";
  if (reposHiddenByFeed > 0) {
    feedTruncationNote =
      `GitHub's activity sidebar typically lists ~${ACTIVITY_FEED_REPO_CAP} repos before "N repositories not shown". ` +
      `Search API found ${uniqueRepos} repos — about ${reposHiddenByFeed} may be hidden on your profile feed.`;
  }

  return {
    totalContributions: pr.total + issue.total + review.total,
    uniqueRepos,
    reposVisibleOnFeed,
    reposHiddenByFeed,
    feedTruncationNote,
    topRepos,
    busiestDay: busiestDay(allItems),
    mergeRate,
    byKind: { pr: pr.total, issue: issue.total, review: review.total },
  };
}

export async function runFullAudit(
  username: string,
  range: DateRange,
  runAuditFn: (
    user: string,
    kind: "pr" | "issue" | "review",
    range: DateRange,
    onProgress?: (msg: string) => void
  ) => Promise<AuditResult>,
  onProgress?: (message: string) => void
): Promise<FullAuditResult> {
  onProgress?.(`Auditing pull requests for @${username}…`);
  const pullRequests = await runAuditFn(username, "pr", range, onProgress);

  onProgress?.(`Auditing issues for @${username}…`);
  const issues = await runAuditFn(username, "issue", range, onProgress);

  onProgress?.(`Auditing reviews for @${username}…`);
  const reviews = await runAuditFn(username, "review", range, onProgress);

  const insights = buildInsights(pullRequests, issues, reviews);

  return {
    username,
    range,
    pullRequests,
    issues,
    reviews,
    insights,
  };
}
