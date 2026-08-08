import { readFileSync } from "node:fs";
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
import { createReportGist, type GistReport } from "@felix-ayush/openhearth-core/gist.js";
import { setAuthToken } from "@felix-ayush/openhearth-core/github.js";
import { runAudit } from "@felix-ayush/openhearth-core/aggregate.js";

export type AgentToolName =
  | "run_audit"
  | "run_hidden"
  | "run_proof"
  | "compare_users"
  | "lens_repo"
  | "publish_gist_report"
  | "write_digest"
  | "ask_summary";

export interface AgentRunContext {
  token?: string;
  aiProvider?: LLMProviderId;
  aiModel?: string;
  aiTone?: SummaryTone;
  dryRun?: boolean;
  tokenBudget?: number;
  approvalRequired?: boolean;
}

export interface AgentToolResult {
  ok: boolean;
  tool: AgentToolName;
  output?: unknown;
  error?: string;
  tokensUsed?: number;
  approved?: boolean;
}

export interface AgentTranscript {
  id: string;
  startedAt: string;
  inputs: Record<string, unknown>;
  steps: Array<{ tool: string; ok: boolean; output?: unknown; error?: string; at: string }>;
  finishedAt: string;
}

let transcriptIdCounter = 0;

export function createAgentTranscript(inputs: Record<string, unknown>): AgentTranscript {
  transcriptIdCounter += 1;
  const id = `agent-${new Date().toISOString().slice(0, 10)}-${transcriptIdCounter}`;
  return { id, startedAt: new Date().toISOString(), inputs, steps: [], finishedAt: "" };
}

function appendTranscriptStep(
  transcript: AgentTranscript,
  step: { tool: string; ok: boolean; output?: unknown; error?: string }
): void {
  transcript.steps.push({ ...step, at: new Date().toISOString() });
  transcript.finishedAt = new Date().toISOString();
}

function isWriteTool(name: AgentToolName): boolean {
  return name === "publish_gist_report" || name === "write_digest";
}

function resolveAgentRange(opts: {
  month?: string;
  year?: string;
  from?: string;
  to?: string;
}): { from: string; to: string } {
  if (opts.from && opts.to) return { from: opts.from, to: opts.to };
  if (opts.month) {
    const [y, m] = opts.month.split("-").map(Number);
    const from = `${opts.month}-01`;
    const to = `${y}-${String(m).padStart(2, "0")}-${new Date(y, m, 0).getDate()}`;
    return { from, to };
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

function rangeLabel(range: { from: string; to: string }): string {
  return `${range.from} -> ${range.to}`;
}

export async function runAgentTool(
  name: AgentToolName,
  args: Record<string, unknown>,
  ctx: AgentRunContext,
  transcript?: AgentTranscript
): Promise<AgentToolResult> {
  const budget = ctx.tokenBudget ?? 0;
  const used = transcript?.steps.length ?? 0;
  if (budget > 0 && used >= budget) {
    const msg = `Token budget exhausted (${used}/${budget}).`;
    appendTranscriptStep(transcript ?? createAgentTranscript(args), { tool: name, ok: false, error: msg });
    return { ok: false, tool: name, error: msg, tokensUsed: used };
  }

  if (ctx.approvalRequired && isWriteTool(name)) {
    const approved = typeof args.approve === "string" ? args.approve === "true" : false;
    if (!approved && !ctx.dryRun) {
      const msg = `Approval required for ${name}. Pass approve=true to continue.`;
      appendTranscriptStep(transcript ?? createAgentTranscript(args), { tool: name, ok: false, error: msg });
      return { ok: false, tool: name, error: msg, approved: false, tokensUsed: used };
    }
  }

  if (ctx.dryRun) {
    const msg = `Dry-run: skipped ${name}.`;
    appendTranscriptStep(transcript ?? createAgentTranscript(args), { tool: name, ok: true, output: { dryRun: true, message: msg } });
    return { ok: true, tool: name, output: { dryRun: true, message: msg }, approved: true, tokensUsed: used };
  }

  if (ctx.token) setAuthToken(ctx.token);

  try {
    const out = await executeTool(name, args, ctx);
    appendTranscriptStep(transcript ?? createAgentTranscript(args), { tool: name, ok: true, output: out });
    return { ok: true, tool: name, output: out, approved: true, tokensUsed: used + 1 };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    appendTranscriptStep(transcript ?? createAgentTranscript(args), { tool: name, ok: false, error: message });
    return { ok: false, tool: name, error: message, tokensUsed: used + 1 };
  }
}

async function executeTool(
  name: AgentToolName,
  args: Record<string, unknown>,
  ctx: AgentRunContext
): Promise<unknown> {
  switch (name) {
    case "run_audit": {
      const username = String(args.username ?? "").trim();
      if (!username) throw new Error("run_audit requires username.");
      const range = resolveAgentRange({
        month: args.month ? String(args.month) : undefined,
        year: args.year ? String(args.year) : undefined,
        from: args.from ? String(args.from) : undefined,
        to: args.to ? String(args.to) : undefined,
      });
      const full = await runFullAudit(username, range, runAudit, (msg) => console.log(`  progress: ${msg}`));
      return { username, range, insights: full.insights };
    }
    case "run_hidden": {
      const username = String(args.username ?? "").trim();
      if (!username) throw new Error("run_hidden requires username.");
      const range = resolveAgentRange({
        month: args.month ? String(args.month) : undefined,
        year: args.year ? String(args.year) : undefined,
        from: args.from ? String(args.from) : undefined,
        to: args.to ? String(args.to) : undefined,
      });
      const full = await runFullAudit(username, range, runAudit, (msg) => console.log(`  progress: ${msg}`));
      return { username, range, insights: full.insights, explanations: buildHiddenRepoExplanations(full.insights) };
    }
    case "run_proof": {
      const username = String(args.username ?? "").trim();
      if (!username) throw new Error("run_proof requires username.");
      const range = resolveAgentRange({
        month: args.month ? String(args.month) : undefined,
        year: args.year ? String(args.year) : undefined,
        from: args.from ? String(args.from) : undefined,
        to: args.to ? String(args.to) : undefined,
      });
      const full = await runFullAudit(username, range, runAudit, (msg) => console.log(`  progress: ${msg}`));
      return { username, range, proof: buildFeedSearchProof(full.insights) };
    }
    case "compare_users": {
      const userA = String(args.userA ?? "").trim();
      const userB = String(args.userB ?? "").trim();
      if (!userA || !userB) throw new Error("compare_users requires userA and userB.");
      const range = resolveAgentRange({
        month: args.month ? String(args.month) : undefined,
        year: args.year ? String(args.year) : undefined,
        from: args.from ? String(args.from) : undefined,
        to: args.to ? String(args.to) : undefined,
      });
      const [a, b] = await Promise.all([
        runFullAudit(userA, range, runAudit, (msg) => console.log(`  progress: ${msg}`)),
        runFullAudit(userB, range, runAudit, (msg) => console.log(`  progress: ${msg}`)),
      ]);
      return { userA, userB, range, overlap: computeRepoOverlap(userA, a.insights, userB, b.insights) };
    }
    case "lens_repo": {
      const username = String(args.username ?? "").trim();
      const repo = String(args.repo ?? "").trim();
      if (!username || !repo) throw new Error("lens_repo requires username and repo.");
      const range = resolveAgentRange({
        month: args.month ? String(args.month) : undefined,
        year: args.year ? String(args.year) : undefined,
        from: args.from ? String(args.from) : undefined,
        to: args.to ? String(args.to) : undefined,
      });
      const result = await runRepoLens(username, repo, range, (msg) => console.log(`  progress: ${msg}`));
      return { username, repo, range, result };
    }
    case "publish_gist_report": {
      const path = String(args.path ?? "").trim();
      if (!path) throw new Error("publish_gist_report requires path to report JSON.");
      const card = JSON.parse(readFileSync(path, "utf8")) as GistReport;
      return { gist: await createReportGist(card) };
    }
    case "write_digest": {
      const path = String(args.path ?? "").trim();
      const webhook = args.webhook ? String(args.webhook) : undefined;
      if (!path) throw new Error("write_digest requires path to audit JSON.");
      const data = JSON.parse(readFileSync(path, "utf8")) as { username?: string; range?: { from: string; to: string }; insights?: AuditInsights };
      if (!data.insights || !data.username) throw new Error("JSON must include username + insights.");
      const label = data.range ? `${data.range.from} -> ${data.range.to}` : "audit";
      const md = formatDigestMarkdown({ username: data.username, label, insights: data.insights });
      const payload = { username: data.username, label, markdown: md, postedTo: webhook ?? null };
      if (webhook) console.log(`  webhook: ${webhook}`);
      return { digest: payload };
    }
    case "ask_summary": {
      const username = String(args.username ?? "").trim();
      if (!username) throw new Error("ask_summary requires username.");
      const range = resolveAgentRange({
        month: args.month ? String(args.month) : undefined,
        year: args.year ? String(args.year) : undefined,
        from: args.from ? String(args.from) : undefined,
        to: args.to ? String(args.to) : undefined,
      });
      const full = await runFullAudit(username, range, runAudit, (msg) => console.log(`  progress: ${msg}`));
      const provider = ctx.aiProvider
        ? (await import("@felix-ayush/openhearth-core/llm.js")).createLLMClient({ provider: ctx.aiProvider, model: ctx.aiModel })
        : undefined;
      const summary = await generateAuditSummary(full.insights, `@${username} · ${rangeLabel(range)}`, provider, {
        tone: (args.tone as SummaryTone | undefined) ?? ctx.aiTone ?? "neutral",
      });
      return { username, range, summary };
    }
    default:
      throw new Error(`Unknown agent tool: ${name}`);
  }
}
