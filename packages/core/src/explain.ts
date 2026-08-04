// OpenHearth AI explainers — deterministic, evidence-cited reasoning for the
// product's two core theses: WHY repos are hidden (#2) and the feed-vs-search
// gap narrative (#66).
//
// These are template/heuristic functions (no LLM, no network) so they work
// out of the box and are fully testable in CI. They complement the AI summary
// layer (ai-summary.ts) which can upgrade the same evidence via a model.

import { ACTIVITY_FEED_REPO_CAP } from "./github.js";
import type { AuditInsights, RepoCount } from "./insights.js";
import type { FeedSearchProof } from "./proof.js";

// ─── #2 Hidden-repo explainer ───────────────────────────────────────────────

export type HiddenRepoSeverity = "high" | "medium" | "low";

export interface HiddenRepoExplanation {
  repo: string;
  count: number;
  /** 1-based rank among hidden repos, least activity first (1 = most likely hidden). */
  rank: number;
  severity: HiddenRepoSeverity;
  reasons: string[];
}

/**
 * Explain WHY each likely-hidden repo was probably truncated from the activity
 * feed. Uses ranked activity + position heuristics — no LLM needed (ROADMAP #2).
 */
export function buildHiddenRepoExplanations(insights: AuditInsights): HiddenRepoExplanation[] {
  const hidden = insights.likelyHiddenRepos;
  if (hidden.length === 0) return [];

  return hidden.map((entry: RepoCount, index: number) => {
    const rank = index + 1;
    const reasons: string[] = [];

    // Position heuristic — past the activity-feed cap
    const overallPosition = ACTIVITY_FEED_REPO_CAP + rank;
    reasons.push(
      `Ranked #${overallPosition} by activity — past the activity feed's ~${ACTIVITY_FEED_REPO_CAP} busiest-repo cap, so it falls into "N repositories not shown".`
    );

    // Activity-count heuristic
    if (entry.count === 1) {
      reasons.push("Only a single contribution in this range — easily drowned out by busier repositories.");
    } else if (entry.count <= 3) {
      reasons.push(
        `Just ${entry.count} contributions in range — low signal compared to the busiest repos (${insights.topRepos[0]?.count ?? "?"} at the top).`
      );
    } else {
      reasons.push(
        `${entry.count} contributions — below the activity threshold that typically earns a sidebar slot.`
      );
    }

    // Rank heuristic among hidden repos
    if (rank === 1) {
      reasons.push("Least active of the hidden set — most likely to be truncated.");
    } else if (rank <= 3) {
      reasons.push(`Among the 3 least-active hidden repos (rank ${rank} of ${hidden.length}).`);
    } else if (rank === hidden.length) {
      reasons.push(`Most active of the hidden set (rank ${rank} of ${hidden.length}) — closest to reappearing on the feed.`);
    }

    const severity: HiddenRepoSeverity = entry.count <= 1 ? "high" : entry.count <= 3 ? "medium" : "low";

    return { repo: entry.repo, count: entry.count, rank, severity, reasons };
  });
}

// ─── #66 Proof mode narration ───────────────────────────────────────────────

export interface ProofNarration {
  headline: string;
  body: string[];
  verdict: string;
}

/**
 * Turn the feed-vs-search proof into a human-readable narrative (ROADMAP #66).
 * Deterministic — no LLM. Explains the gap and what it means for visibility.
 */
export function buildProofNarration(
  proof: FeedSearchProof,
  insights: AuditInsights
): ProofNarration {
  const hidden = proof.searchFound.likelyHidden.length;
  const gap = proof.searchFound.totalRepos - proof.feedWouldShow.length;
  const body: string[] = [];

  body.push(
    `GitHub's activity sidebar would show roughly ${proof.feedWouldShow.length} of the ` +
      `${proof.searchFound.totalRepos} repositories that received contributions this range ` +
      `(insights.reposVisibleOnFeed=${insights.reposVisibleOnFeed}, ` +
      `insights.uniqueRepos=${insights.uniqueRepos}).`
  );

  if (hidden > 0) {
    body.push(
      `Search API found ${proof.searchFound.totalRepos} repositories with ` +
        `${proof.searchFound.totalContributions} total contributions, but the feed caps at ` +
        `~${proof.feedCap} busiest repos. That leaves about ${hidden} lower-activity repositories ` +
        `in the "N repositories not shown" truncation zone (insights.reposHiddenByFeed=${insights.reposHiddenByFeed}).`
    );
    body.push(
      `These ${hidden} repos earned real contributions but won't appear on the profile sidebar — ` +
        `they are listed as "likely hidden" (least activity first) so the work is visible somewhere.`
    );
  } else {
    body.push(
      `Search and the feed agree: all ${proof.searchFound.totalRepos} repositories are within the ` +
        `sidebar's visible window for this range — nothing is truncated.`
    );
  }

  if (proof.feedWouldShow[0]) {
    body.push(
      `The busiest repo the feed would surface is ${proof.feedWouldShow[0].repo} ` +
        `(${proof.feedWouldShow[0].count} contributions).`
    );
  }

  const verdict =
    hidden > 0
      ? `Verdict: the activity feed undercounts by ~${gap} repos. Use the Search-backed audit for the full picture.`
      : `Verdict: the activity feed and Search agree — no hidden work this range.`;

  return {
    headline: proof.headline,
    body,
    verdict,
  };
}
