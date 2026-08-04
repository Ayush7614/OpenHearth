import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  ACTIVITY_FEED_REPO_CAP,
  buildAISafetyCard,
  buildEvidence,
  buildInsights,
  buildShareCaption,
  buildSummaryPrompt,
  createLLMClient,
  generateAuditSummary,
  resolveLLMConfig,
  templateSummary,
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

describe("2.6 AI summaries — LLM config", () => {
  it("defaults to the stub provider with no env", () => {
    const cfg = resolveLLMConfig({});
    assert.equal(cfg.provider, "stub");
  });

  it("selects ollama/openai/anthropic from OPENHEARTH_LLM", () => {
    assert.equal(resolveLLMConfig({ OPENHEARTH_LLM: "ollama" }).provider, "ollama");
    assert.equal(resolveLLMConfig({ OPENHEARTH_LLM: "OpenAI" }).provider, "openai");
    assert.equal(resolveLLMConfig({ OPENHEARTH_LLM: "anthropic" }).provider, "anthropic");
  });

  it("falls back to stub for unknown providers", () => {
    assert.equal(resolveLLMConfig({ OPENHEARTH_LLM: "nope" }).provider, "stub");
  });

  it("createLLMClient returns a stub that refuses to call a model", async () => {
    const client = createLLMClient({ provider: "stub" });
    assert.equal(client.id, "stub");
    await assert.rejects(() => client.complete({ messages: [] }), /stub/);
  });

  it("createLLMClient defaults to stub + default model when given empty/undefined config", () => {
    const client = createLLMClient({});
    assert.equal(client.id, "stub");
    assert.equal(client.model, "openhearth-template");
    const undefClient = createLLMClient({ provider: undefined, model: undefined });
    assert.equal(undefClient.id, "stub");
    assert.equal(undefClient.model, "openhearth-template");
  });
});

describe("2.6 AI summaries — evidence & safety card", () => {
  it("builds evidence citations for every key metric", () => {
    const insights = manyRepoInsights();
    const ev = buildEvidence(insights);
    const sources = ev.map((e) => e.source);
    assert.ok(sources.includes("insights.totalContributions"));
    assert.ok(sources.includes("insights.uniqueRepos"));
    assert.ok(sources.includes("insights.reposHiddenByFeed"));
    assert.ok(sources.includes("insights.mergeRate"));
  });

  it("safety card marks stub/ollama as local-only and never sends tokens", () => {
    const stub = buildAISafetyCard("stub", "openhearth-template");
    assert.equal(stub.localOnly, true);
    assert.match(stub.tokensNeverSent, /never sent/);
    assert.match(stub.transparencyDisclosure, /no external AI model/);
    const openai = buildAISafetyCard("openai", "gpt-4o-mini");
    assert.equal(openai.localOnly, false);
    assert.match(openai.whatLeavesMachine, /cloud model provider/);
  });
});

describe("2.6 AI summaries — template summarizer (no network)", () => {
  it("cites evidence inline and mentions hidden repos", () => {
    const insights = manyRepoInsights();
    const text = templateSummary(insights, "2026-07", "neutral");
    assert.match(text, /insights\.totalContributions=/);
    assert.match(text, /insights\.uniqueRepos=/);
    assert.match(text, /insights\.reposHiddenByFeed=/);
    assert.match(text, /likely truncated/);
    assert.match(text, /no external AI model/);
  });

  it("shifts the lead line per tone", () => {
    const insights = manyRepoInsights();
    const hiring = templateSummary(insights, "2026-07", "hiring");
    const humble = templateSummary(insights, "2026-07", "humble");
    assert.match(hiring, /portfolio-ready/);
    assert.match(humble, /for the record/);
    assert.notEqual(hiring.split("\n")[2], humble.split("\n")[2]);
  });

  it("buildSummaryPrompt includes the evidence facts and anti-hallucination rules", () => {
    const insights = manyRepoInsights();
    const msgs = buildSummaryPrompt(insights, "2026-07", "technical");
    assert.equal(msgs[0].role, "system");
    assert.match(msgs[0].content, /Never invent/);
    assert.match(msgs[1].content, /Audit label: 2026-07/);
    assert.match(msgs[1].content, /insights\.totalContributions/);
  });
});

describe("2.6 AI summaries — generateAuditSummary (stub path)", () => {
  it("returns a summary with provider=stub and a safety card, no network", async () => {
    const insights = manyRepoInsights();
    const summary = await generateAuditSummary(insights, "2026-07");
    assert.equal(summary.provider, "stub");
    assert.equal(summary.safetyCard.provider, "stub");
    assert.ok(summary.evidence.length >= 7);
    assert.match(summary.text, /insights\.totalContributions=/);
    assert.ok(summary.generatedAt);
  });

  it("honors an explicit stub provider and tone", async () => {
    const insights = manyRepoInsights();
    const client = createLLMClient({ provider: "stub" });
    const summary = await generateAuditSummary(insights, "2026-07", client, { tone: "exec" });
    assert.equal(summary.provider, "stub");
    assert.match(summary.text, /Executive summary|contribution impact/);
  });
});

describe("2.6 AI summaries — share-card caption (ROADMAP #4)", () => {
  it("builds a compact caption that includes the share URL and key figures", async () => {
    const insights = manyRepoInsights();
    const summary = await generateAuditSummary(insights, "2026-07");
    const caption = buildShareCaption(summary, "https://example.test/#/share/abc");
    assert.match(caption.text, /contributions across/);
    assert.match(caption.text, /pull requests/);
    assert.match(caption.text, /https:\/\/example\.test\/#\/share\/abc/);
    assert.ok(caption.platform.length > 0);
  });

  it("mentions hidden repos when the feed truncates, and picks a platform per tone", async () => {
    const insights = manyRepoInsights();
    const hiring = await generateAuditSummary(insights, "2026-07", undefined, { tone: "hiring" });
    const cap = buildShareCaption(hiring, "https://x.test/r/1");
    assert.match(cap.text, /likely hidden/);
    assert.equal(cap.platform, "LinkedIn");
    const humble = await generateAuditSummary(insights, "2026-07", undefined, { tone: "humble" });
    assert.equal(buildShareCaption(humble, "u").platform, "README");
  });

  it("omits the hidden-repos clause when nothing is hidden", async () => {
    const insights = buildInsights(
      audit("pr", [item("a/b", 1)]),
      audit("issue", []),
      audit("review", [])
    );
    const summary = await generateAuditSummary(insights, "2026-07");
    const caption = buildShareCaption(summary, "https://x.test/r/2");
    assert.doesNotMatch(caption.text, /likely hidden/);
  });
});

