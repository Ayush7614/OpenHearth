import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  ACTIVITY_FEED_REPO_CAP,
  buildFeedSearchProof,
  buildHiddenRepoExplanations,
  buildInsights,
  buildProofNarration,
} from "../dist/index.js";

function item(repo, n, state = "merged", day = "2026-07-10") {
  return {
    id: n,
    number: n,
    title: `Item ${n}`,
    url: `https://github.com/${repo}/pull/${n}`,
    state,
    createdAt: `${day}T12:00:00Z`,
    closedAt: state === "open" ? null : `${day}T18:00:00Z`,
    repo,
  };
}

function audit(kind, items) {
  const reposMap = new Map();
  for (const i of items) {
    const list = reposMap.get(i.repo) ?? [];
    list.push(i);
    reposMap.set(i.repo, list);
  }
  return {
    kind,
    username: "demo",
    range: { from: "2026-07-01", to: "2026-07-31" },
    total: items.length,
    items,
    repos: [...reposMap.entries()].map(([repo, repoItems]) => ({
      repo,
      open: repoItems.filter((x) => x.state === "open").length,
      merged: repoItems.filter((x) => x.state === "merged").length,
      closed: repoItems.filter((x) => x.state === "closed").length,
      items: repoItems,
    })),
  };
}

function manyRepoInsights() {
  const prItems = [];
  for (let i = 1; i <= ACTIVITY_FEED_REPO_CAP + 5; i++) {
    const count = ACTIVITY_FEED_REPO_CAP + 6 - i;
    for (let j = 0; j < count; j++) {
      prItems.push(item(`org/repo-${i}`, i * 100 + j));
    }
  }
  return buildInsights(audit("pr", prItems), audit("issue", []), audit("review", []));
}

describe("2.6.1 hidden-repo explainer (ROADMAP #2)", () => {
  it("explains every hidden repo with at least one reason", () => {
    const insights = manyRepoInsights();
    const explanations = buildHiddenRepoExplanations(insights);
    assert.equal(explanations.length, insights.likelyHiddenRepos.length);
    for (const ex of explanations) {
      assert.ok(ex.reasons.length >= 2, `${ex.repo} should have >=2 reasons`);
      assert.ok(ex.repo && ex.count >= 1);
      assert.ok(ex.rank >= 1);
      assert.ok(["high", "medium", "low"].includes(ex.severity));
    }
  });

  it("ranks repos 1..N least-activity first and cites the feed cap", () => {
    const insights = manyRepoInsights();
    const explanations = buildHiddenRepoExplanations(insights);
    assert.equal(explanations[0].rank, 1);
    assert.equal(explanations.at(-1).rank, explanations.length);
    assert.match(explanations[0].reasons[0], /activity feed/);
    assert.match(explanations[0].reasons[0], new RegExp(String(ACTIVITY_FEED_REPO_CAP)));
  });

  it("marks single-contribution repos as high severity", () => {
    const insights = manyRepoInsights();
    const explanations = buildHiddenRepoExplanations(insights);
    const single = explanations.find((e) => e.count === 1);
    if (single) assert.equal(single.severity, "high");
  });

  it("returns an empty array when nothing is hidden", () => {
    const insights = buildInsights(
      audit("pr", [item("a/b", 1)]),
      audit("issue", []),
      audit("review", [])
    );
    assert.deepEqual(buildHiddenRepoExplanations(insights), []);
  });
});

describe("2.6.1 proof mode narration (ROADMAP #66)", () => {
  it("narrates the feed-vs-search gap with evidence citations", () => {
    const insights = manyRepoInsights();
    const proof = buildFeedSearchProof(insights);
    const narration = buildProofNarration(proof, insights);
    assert.ok(narration.headline.length > 0);
    assert.ok(narration.body.length >= 2);
    assert.match(narration.body[0], /insights\.reposVisibleOnFeed=/);
    assert.match(narration.body[0], /insights\.uniqueRepos=/);
    assert.match(narration.verdict, /Verdict/);
  });

  it("mentions hidden repos and the truncation zone when repos are hidden", () => {
    const insights = manyRepoInsights();
    const proof = buildFeedSearchProof(insights);
    const narration = buildProofNarration(proof, insights);
    const combined = narration.body.join(" ");
    assert.match(combined, /N repositories not shown/);
    assert.match(combined, /insights\.reposHiddenByFeed=/);
    assert.match(narration.verdict, /undercounts/);
  });

  it("gives an agreeing verdict when nothing is hidden", () => {
    const insights = buildInsights(
      audit("pr", [item("a/b", 1)]),
      audit("issue", []),
      audit("review", [])
    );
    const proof = buildFeedSearchProof(insights);
    const narration = buildProofNarration(proof, insights);
    assert.match(narration.verdict, /agree/);
    assert.doesNotMatch(narration.verdict, /undercounts/);
  });
});
