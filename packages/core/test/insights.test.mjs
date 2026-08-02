import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { ACTIVITY_FEED_REPO_CAP, buildInsights } from "../dist/index.js";

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

describe("buildInsights", () => {
  it("marks repos beyond the activity feed cap as likely hidden", () => {
    const prItems = [];
    for (let i = 1; i <= ACTIVITY_FEED_REPO_CAP + 5; i++) {
      const count = ACTIVITY_FEED_REPO_CAP + 6 - i;
      for (let j = 0; j < count; j++) {
        prItems.push(item(`org/repo-${i}`, i * 100 + j));
      }
    }

    const insights = buildInsights(audit("pr", prItems), audit("issue", []), audit("review", []));
    assert.equal(insights.uniqueRepos, ACTIVITY_FEED_REPO_CAP + 5);
    assert.equal(insights.reposHiddenByFeed, 5);
    assert.equal(insights.likelyHiddenRepos.length, 5);
    assert.ok(insights.likelyHiddenRepos[0].count <= insights.likelyHiddenRepos.at(-1).count);
  });

  it("computes merge rate from PR states", () => {
    const prs = [
      item("a/b", 1, "merged"),
      item("a/b", 2, "merged"),
      item("a/c", 3, "open"),
      item("a/c", 4, "closed"),
    ];
    const insights = buildInsights(audit("pr", prs), audit("issue", []), audit("review", []));
    assert.equal(insights.mergeRate, 50);
    assert.equal(insights.byKind.pr, 4);
  });
});
