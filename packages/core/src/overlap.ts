import type { AuditInsights, RepoCount } from "./insights.js";

export type OverlapResult = {
  userA: string;
  userB: string;
  sharedRepos: RepoCount[];
  onlyA: string[];
  onlyB: string[];
};

function repoSet(insights: AuditInsights): Map<string, number> {
  const map = new Map<string, number>();
  for (const r of [...insights.topRepos, ...insights.likelyHiddenRepos]) {
    map.set(r.repo, Math.max(map.get(r.repo) ?? 0, r.count));
  }
  return map;
}

/** Intersect repos present in two insight snapshots (top + likely-hidden lists). */
export function computeRepoOverlap(
  userA: string,
  insightsA: AuditInsights,
  userB: string,
  insightsB: AuditInsights
): OverlapResult {
  const a = repoSet(insightsA);
  const b = repoSet(insightsB);
  const sharedRepos: RepoCount[] = [];
  for (const [repo, countA] of a) {
    if (b.has(repo)) {
      sharedRepos.push({ repo, count: Math.min(countA, b.get(repo)!) });
    }
  }
  sharedRepos.sort((x, y) => y.count - x.count || x.repo.localeCompare(y.repo));
  const onlyA = [...a.keys()].filter((r) => !b.has(r)).sort();
  const onlyB = [...b.keys()].filter((r) => !a.has(r)).sort();
  return { userA, userB, sharedRepos, onlyA, onlyB };
}
