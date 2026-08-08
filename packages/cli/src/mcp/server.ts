// OpenHearth MCP server — stdio + HTTP tool surface for audits, proofs,
// overlap, lens, digests, and summaries.
//
// ROADMAP 2.7: #46 official MCP server, #47 audit/hidden/proof tools,
// #48 board compare/overlap, #49 resources for saved runs, #50 prompts library,
// #51 auth via device flow / PAT.

import { readFileSync } from "node:fs";
import { createServer } from "node:http";
import type { AuditInsights } from "@felix-ayush/openhearth-core/insights.js";
import {
  buildFeedSearchProof,
  buildHiddenRepoExplanations,
  computeRepoOverlap,
  formatDigestMarkdown,
  generateAuditSummary,
  runFullAudit,
  runRepoLens,
  type LLMProviderId,
  type SummaryTone,
} from "@felix-ayush/openhearth-core";
import { createReportGist, fetchReportGist, type GistReport } from "@felix-ayush/openhearth-core/gist.js";
import { setAuthToken } from "@felix-ayush/openhearth-core/github.js";
import { runAudit } from "@felix-ayush/openhearth-core/aggregate.js";

export type McpTransport = "stdio" | "http";

export interface McpContext {
  token?: string;
  aiProvider?: LLMProviderId;
  aiModel?: string;
  aiTone?: SummaryTone;
  port?: number;
}

export interface McpToolCall {
  name: string;
  arguments?: Record<string, unknown>;
}

export interface McpToolResult {
  ok: boolean;
  output?: unknown;
  error?: string;
}

function resolveRange(opts: { month?: string; year?: string; from?: string; to?: string }): { from: string; to: string } {
  if (opts.from && opts.to) return { from: opts.from, to: opts.to };
  if (opts.month) {
    const [y, m] = opts.month.split("-").map(Number);
    return { from: `${opts.month}-01`, to: `${y}-${String(m).padStart(2, "0")}-${new Date(y, m, 0).getDate()}` };
  }
  if (opts.year) {
    const y = Number(opts.year);
    return { from: `${y}-01-01`, to: `${y}-12-31` };
  }
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth() + 1;
  const month = `${y}-${String(m).padStart(2, "0")}`;
  const [yy, mm] = month.split("-").map(Number);
  return { from: `${month}-01`, to: `${y}-${String(mm).padStart(2, "0")}-${new Date(yy, mm, 0).getDate()}` };
}

export async function callMcpTool(call: McpToolCall, ctx: McpContext): Promise<McpToolResult> {
  if (ctx.token) setAuthToken(ctx.token);
  try {
    const out = await executeMcpTool(call.name, call.arguments ?? {}, ctx);
    return { ok: true, output: out };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, error: message };
  }
}

async function executeMcpTool(name: string, args: Record<string, unknown>, ctx: McpContext): Promise<unknown> {
  switch (name) {
    case "audit": {
      const username = String(args.username ?? "").trim();
      if (!username) throw new Error("audit requires username.");
      const range = resolveRange({ month: args.month ? String(args.month) : undefined, year: args.year ? String(args.year) : undefined, from: args.from ? String(args.from) : undefined, to: args.to ? String(args.to) : undefined });
      const full = await runFullAudit(username, range, runAudit, (msg) => console.log(`  progress: ${msg}`));
      return { username, range, insights: full.insights };
    }
    case "hidden": {
      const username = String(args.username ?? "").trim();
      if (!username) throw new Error("hidden requires username.");
      const range = resolveRange({ month: args.month ? String(args.month) : undefined, year: args.year ? String(args.year) : undefined, from: args.from ? String(args.from) : undefined, to: args.to ? String(args.to) : undefined });
      const full = await runFullAudit(username, range, runAudit, (msg) => console.log(`  progress: ${msg}`));
      return { username, range, insights: full.insights, explanations: buildHiddenRepoExplanations(full.insights) };
    }
    case "proof": {
      const username = String(args.username ?? "").trim();
      if (!username) throw new Error("proof requires username.");
      const range = resolveRange({ month: args.month ? String(args.month) : undefined, year: args.year ? String(args.year) : undefined, from: args.from ? String(args.from) : undefined, to: args.to ? String(args.to) : undefined });
      const full = await runFullAudit(username, range, runAudit, (msg) => console.log(`  progress: ${msg}`));
      return { username, range, proof: buildFeedSearchProof(full.insights) };
    }
    case "overlap": {
      const userA = String(args.userA ?? "").trim();
      const userB = String(args.userB ?? "").trim();
      if (!userA || !userB) throw new Error("overlap requires userA and userB.");
      const range = resolveRange({ month: args.month ? String(args.month) : undefined, year: args.year ? String(args.year) : undefined, from: args.from ? String(args.from) : undefined, to: args.to ? String(args.to) : undefined });
      const [a, b] = await Promise.all([
        runFullAudit(userA, range, runAudit, (msg) => console.log(`  progress: ${msg}`)),
        runFullAudit(userB, range, runAudit, (msg) => console.log(`  progress: ${msg}`)),
      ]);
      return { userA, userB, range, overlap: computeRepoOverlap(userA, a.insights, userB, b.insights) };
    }
    case "lens": {
      const username = String(args.username ?? "").trim();
      const repo = String(args.repo ?? "").trim();
      if (!username || !repo) throw new Error("lens requires username and repo.");
      const range = resolveRange({ month: args.month ? String(args.month) : undefined, year: args.year ? String(args.year) : undefined, from: args.from ? String(args.from) : undefined, to: args.to ? String(args.to) : undefined });
      const result = await runRepoLens(username, repo, range, (msg) => console.log(`  progress: ${msg}`));
      return { username, repo, range, result };
    }
    case "digest": {
      const path = String(args.path ?? "").trim();
      if (!path) throw new Error("digest requires path to audit JSON.");
      const data = JSON.parse(readFileSync(path, "utf8")) as { username?: string; range?: { from: string; to: string }; insights?: AuditInsights };
      if (!data.insights || !data.username) throw new Error("JSON must include username + insights.");
      const label = data.range ? `${data.range.from} -> ${data.range.to}` : "audit";
      return { username: data.username, label, markdown: formatDigestMarkdown({ username: data.username, label, insights: data.insights }) };
    }
    case "summary": {
      const username = String(args.username ?? "").trim();
      if (!username) throw new Error("summary requires username.");
      const range = resolveRange({ month: args.month ? String(args.month) : undefined, year: args.year ? String(args.year) : undefined, from: args.from ? String(args.from) : undefined, to: args.to ? String(args.to) : undefined });
      const full = await runFullAudit(username, range, runAudit, (msg) => console.log(`  progress: ${msg}`));
      const provider = ctx.aiProvider
        ? (await import("@felix-ayush/openhearth-core/llm.js")).createLLMClient({ provider: ctx.aiProvider, model: ctx.aiModel })
        : undefined;
      const summary = await generateAuditSummary(full.insights, `@${username}`, provider, { tone: (args.tone as SummaryTone | undefined) ?? ctx.aiTone ?? "neutral" });
      return { username, range, summary };
    }
    case "publish_gist": {
      const path = String(args.path ?? "").trim();
      if (!path) throw new Error("publish_gist requires path to report JSON.");
      const card = JSON.parse(readFileSync(path, "utf8")) as GistReport;
      return { gist: await createReportGist(card) };
    }
    case "fetch_gist": {
      const id = String(args.id ?? "").trim();
      if (!id) throw new Error("fetch_gist requires gist id.");
      return { card: await fetchReportGist(id) };
    }
    case "prompt_hiring":
      return { prompt: hiringPrompt(args.username ? String(args.username) : "candidate") };
    case "prompt_digest":
      return { prompt: digestPrompt(args.username ? String(args.username) : "user") };
    default:
      throw new Error(`Unknown MCP tool: ${name}`);
  }
}

function hiringPrompt(username: string): string {
  return `Summarize @${username}'s contribution impact for a hiring review. Focus on breadth across repositories, PR merge rate, and any likely-hidden activity.`;
}

function digestPrompt(username: string): string {
  return `Create a Slack/Discord digest for @${username} that highlights total contributions, hidden repo count, and top repositories.`;
}

export function startMcpServer(ctx: McpContext): void {
  const port = ctx.port ?? 9455;
  const server = createServer(async (req, res) => {
    const url = new URL(req.url ?? "/", `http://localhost:${port}`);
    res.setHeader("content-type", "application/json");
    if (url.pathname === "/health" && req.method === "GET") {
      res.statusCode = 200;
      res.end(JSON.stringify({ ok: true, service: "openhearth-mcp", port }));
      return;
    }
    if (url.pathname === "/tools/call" && req.method === "POST") {
      let body = "";
      req.on("data", (chunk) => { body += chunk; });
      req.on("end", async () => {
        try {
          const call = JSON.parse(body) as McpToolCall;
          const result = await callMcpTool(call, ctx);
          res.statusCode = result.ok ? 200 : 400;
          res.end(JSON.stringify(result));
        } catch (err) {
          res.statusCode = 400;
          res.end(JSON.stringify({ ok: false, error: err instanceof Error ? err.message : String(err) }));
        }
      });
      return;
    }
    res.statusCode = 404;
    res.end(JSON.stringify({ ok: false, error: "not found" }));
  });
  server.listen(port, () => {
    console.log(`MCP server listening on http://localhost:${port}`);
  });
}
