import { ACTIVITY_FEED_REPO_CAP } from "./github.js";
import type { AuditInsights, RepoCount } from "./insights.js";

/** Side-by-side view: what the activity feed likely shows vs Search. */
export type FeedSearchProof = {
  feedCap: number;
  feedWouldShow: RepoCount[];
  searchFound: {
    totalRepos: number;
    totalContributions: number;
    likelyHidden: RepoCount[];
  };
  headline: string;
};

export function buildFeedSearchProof(insights: AuditInsights): FeedSearchProof {
  const feedWouldShow = insights.topRepos.slice(0, Math.min(10, ACTIVITY_FEED_REPO_CAP));
  const hidden = insights.likelyHiddenRepos;
  const headline =
    insights.reposHiddenByFeed > 0
      ? `Feed ~${insights.reposVisibleOnFeed} repos · Search ${insights.uniqueRepos} · ~${insights.reposHiddenByFeed} likely hidden`
      : `Feed and Search agree — all ${insights.uniqueRepos} repos likely visible`;

  return {
    feedCap: ACTIVITY_FEED_REPO_CAP,
    feedWouldShow,
    searchFound: {
      totalRepos: insights.uniqueRepos,
      totalContributions: insights.totalContributions,
      likelyHidden: hidden,
    },
    headline,
  };
}
