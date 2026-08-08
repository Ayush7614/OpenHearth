import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import {
  APP_NAME,
  auditToCsv,
  auditToJson,
  bitbucketForge,
  buildFeedSearchProof,
  buildHiddenRepoExplanations,
  buildPortfolioCard,
  buildProofNarration,
  buildReportCard,
  buildShareCaption,
  checkRateLimit,
  computeRepoOverlap,
  defaultLensRange,
  authSetupInstructions,
  createReportGist,
  encodeCardPayload,
  exampleConfigYaml,
  formatDigestMarkdown,
  formatDigestPlain,
  fullAuditToCsv,
  fullAuditToJson,
  createLLMClient,
  generateAuditSummary,
  getAuthToken,
  githubForge,
  gitlabForge,
  parseConfigText,
  parseMonth,
  parseYear,
  pollDeviceToken,
  runAudit,
  runFullAudit,
  runRepoLens,
  setAuthToken,
  startDeviceFlow,
  unsupportedForgeError,
  validateAuth,
  type AuditInsights,
  type AuditKind,
  type DateRange,
  type AuditSummary,
  type ForgeId,
  type FullAuditResult,
  type GistReport,
  type HiddenRepoExplanation,
  type LLMProviderId,
  type ProofNarration,
  type ShareCaption,
  type SummaryTone,
} from "@felix-ayush/openhearth-core";
import {
  createAgentTranscript,
  runAgentTool,
  type AgentRunContext,
  type AgentToolName,
  type AgentToolResult,
  type AgentTranscript,
} from "./agent/index.js";
import { startMcpServer, type McpContext } from "./mcp/server.js";
import {
  printAISafetyCard,
  printAISummary,
  printAuditSection,
  printBanner,
  printDoctor,
  printError,
  printFullReport,
  printHiddenExplanations,
  printInsights,
  printLens,
  printLikelyHidden,
  printOverlap,
  printProgress,
  printProof,
  printProofNarration,
  printRadarRow,
} from "./format.js";

const SITE_BASE = "https://ayush7614.github.io/OpenHearth/";

type Command =
  | "audit"
  | "hidden"
  | "doctor"
  | "proof"
  | "radar"
  | "overlap"
  | "lens"
  | "digest"
  | "share"
  | "portfolio"
  | "forges"
  | "auth"
  | "config"
  | "run"
  | "agent"
  | "mcp";

type CliOptions = {
  command: Command;
  username: string;
  usernameB: string;
  repo: string;
  month?: string;
  year?: string;
  from?: string;
  to?: string;
  token?: string;
  kind: AuditKind | "all";
  json?: string;
  csv?: string;
  usersFile?: string;
  configPath?: string;
  forge: ForgeId;
  aiSummary: boolean;
  aiExplain: boolean;
  aiTone?: SummaryTone;
  aiProvider?: LLMProviderId;
  aiModel?: string;
  gist: boolean;
  quiet: boolean;
  help: boolean;
  version: boolean;
  agentTool?: string;
  mcpPort?: number;
};

function cliVersion(): string {
  const injected = typeof __OPENHEARTH_VERSION__ !== "undefined" ? __OPENHEARTH_VERSION__ : "";
  if (injected) return injected;
  try {
    const here = dirname(fileURLToPath(import.meta.url));
    const pkg = JSON.parse(readFileSync(join(here, "..", "package.json"), "utf8")) as {
      version: string;
    };
    return pkg.version;
  } catch {
    return "0.0.0";
  }
}

declare const __OPENHEARTH_VERSION__: string;

function usage(): string {
  return `
${APP_NAME} — audit GitHub contributions the activity feed hides

Usage:
  openhearth audit <username> [options]
  openhearth hidden <username> [options]
  openhearth proof <username> [options]
  openhearth radar --users-file users.txt [options]
  openhearth overlap <userA> <userB> [options]
  openhearth lens <username> <owner/repo> [options]
  openhearth digest <audit.json>
  openhearth share <username> [options]
  openhearth portfolio <username> [options]
  openhearth forges
  openhearth auth [login|status|init]
  openhearth config init
  openhearth run [--config openhearth.yml]
  openhearth agent <tool> --username USER [options]
  openhearth mcp [--port 9455]
  openhearth doctor
  openhearth --version

Commands:
  audit       Full PR + issue + review audit (default)
  hidden      Hidden-repo report vs activity sidebar
  proof       Feed vs Search side-by-side proof
  radar       Team/org multi-user audit from a username list
  overlap     Shared repos between two users (from live audits)
  lens        Contributor lens for one repository
  digest      Slack/Discord markdown from an audit JSON file (--ai-summary supported)
  share       Public report-card URL (add --gist for short #/r/:id)
  portfolio   Hiring/portfolio card URL (--gist supported)
  config      Print example openhearth.yml (config init writes file)
  run         Radar from openhearth.yml / openhearth.json
  auth        Token wizard / OAuth device login / status
  forges      List forge adapters (GitHub live; others stubbed)
  doctor      Check auth + GitHub rate-limit status
  agent       Run one agent tool with approval / dry-run / budget controls
  mcp         Start OpenHearth MCP HTTP server

Agent tools:
  run_audit, run_hidden, run_proof, compare_users, lens_repo,
  publish_gist_report, write_digest, ask_summary

Options:
  --month YYYY-MM     Audit a calendar month (e.g. 2026-07)
  --year YYYY         Full calendar year range
  --from YYYY-MM-DD   Custom range start
  --to YYYY-MM-DD     Custom range end
  --kind pr|issue|review|all   Default: all
  --token TOKEN       GitHub PAT (or set GITHUB_TOKEN)
  --users-file PATH   Newline/comma-separated usernames (radar)
  --config PATH       openhearth.yml / .json for run
  --gist              Publish share/portfolio card to a public gist (short URL)
  --forge github|gitlab|bitbucket   Default: github
  --ai-summary        Generate an AI narrative of the audit (default: local template)
  --ai-explain        Explain why each hidden repo was likely truncated (hidden command)
  --ai-tone T         neutral|hiring|humble|technical|exec (default: neutral)
  --ai-provider P     stub|ollama|openai|anthropic (default: stub / OPENHEARTH_LLM)
  --ai-model NAME     Model name (default per provider; or OPENHEARTH_LLM_MODEL)
  --json [file]       Export JSON (stdout if no file)
  --csv [file]        Export CSV (stdout if no file)
  --quiet             Minimal output
  --approve           Allow write tools when approval gates are enabled
  --dry-run           Simulate tool calls without side effects
  --budget N          Max agent/MCP tool calls per run
  --port N            MCP server port (default: 9455)
  -V, --version       Print CLI version
  -h, --help          Show help

Examples:
  npx @felix-ayush/openhearth audit Ayush7614 --month 2026-07
  npx @felix-ayush/openhearth agent run_audit --username Ayush7614 --month 2026-07
  npx @felix-ayush/openhearth agent publish_gist_report --approve --path card.json
  npx @felix-ayush/openhearth mcp --port 9455
`;
}

const COMMANDS = new Set<Command>([
  "audit",
  "hidden",
  "doctor",
  "proof",
  "radar",
  "overlap",
  "lens",
  "digest",
  "share",
  "portfolio",
  "forges",
  "auth",
  "config",
  "run",
  "agent",
  "mcp",
]);

function parseArgs(argv: string[]): CliOptions {
  const opts: CliOptions = {
    command: "audit",
    username: "",
    usernameB: "",
    repo: "",
    kind: "all",
    forge: "github",
    aiSummary: false,
    aiExplain: false,
    gist: false,
    quiet: false,
    help: false,
    version: false,
  };

  const positional: string[] = [];

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "-h" || arg === "--help") {
      opts.help = true;
      continue;
    }
    if (arg === "-V" || arg === "--version") {
      opts.version = true;
      continue;
    }
    if (arg === "--quiet") {
      opts.quiet = true;
      continue;
    }
    if (arg === "--month" && argv[i + 1]) {
      opts.month = argv[++i];
      continue;
    }
    if (arg === "--year" && argv[i + 1]) {
      opts.year = argv[++i];
      continue;
    }
    if (arg === "--from" && argv[i + 1]) {
      opts.from = argv[++i];
      continue;
    }
    if (arg === "--to" && argv[i + 1]) {
      opts.to = argv[++i];
      continue;
    }
    if (arg === "--token" && argv[i + 1]) {
      opts.token = argv[++i];
      continue;
    }
    if (arg === "--kind" && argv[i + 1]) {
      opts.kind = argv[++i] as AuditKind | "all";
      continue;
    }
    if (arg === "--users-file" && argv[i + 1]) {
      opts.usersFile = argv[++i];
      continue;
    }
    if (arg === "--forge" && argv[i + 1]) {
      opts.forge = argv[++i] as ForgeId;
      continue;
    }
    if (arg === "--config" && argv[i + 1]) {
      opts.configPath = argv[++i];
      continue;
    }
    if (arg === "--ai-summary") {
      opts.aiSummary = true;
      continue;
    }
    if (arg === "--ai-explain") {
      opts.aiExplain = true;
      continue;
    }
    if (arg === "--ai-tone" && argv[i + 1]) {
      opts.aiTone = argv[++i] as SummaryTone;
      continue;
    }
    if (arg === "--ai-provider" && argv[i + 1]) {
      opts.aiProvider = argv[++i] as LLMProviderId;
      continue;
    }
    if (arg === "--ai-model" && argv[i + 1]) {
      opts.aiModel = argv[++i];
      continue;
    }
    if (arg === "--gist") {
      opts.gist = true;
      continue;
    }
    if (arg === "--json") {
      opts.json = argv[i + 1] && !argv[i + 1].startsWith("-") ? argv[++i] : "-";
      continue;
    }
    if (arg === "--csv") {
      opts.csv = argv[i + 1] && !argv[i + 1].startsWith("-") ? argv[++i] : "-";
      continue;
    }
    if (arg === "--approve") {
      // handled as positional-like flag for agent tool args
      continue;
    }
    if (arg === "--dry-run") {
      continue;
    }
    if (arg === "--budget" && argv[i + 1]) {
      opts.mcpPort = Number(argv[++i]);
      continue;
    }
    if (arg === "--port" && argv[i + 1]) {
      opts.mcpPort = Number(argv[++i]);
      continue;
    }
    if (!arg.startsWith("-")) positional.push(arg);
  }

  if (positional[0] && COMMANDS.has(positional[0] as Command)) {
    opts.command = positional[0] as Command;
    opts.username = (positional[1] ?? "").replace(/^@/, "");
    if (opts.command === "overlap") {
      opts.usernameB = (positional[2] ?? "").replace(/^@/, "");
    }
    if (opts.command === "lens") {
      opts.repo = positional[2] ?? "";
    }
    if (opts.command === "digest") {
      opts.usersFile = positional[1] ?? "";
    }
    if (opts.command === "agent") {
      opts.agentTool = (positional[1] ?? "").trim() || undefined;
    }
  } else {
    opts.username = (positional[0] ?? "").replace(/^@/, "");
  }

  return opts;
}

function resolveRange(opts: CliOptions): DateRange {
  if (opts.month) return parseMonth(opts.month);
  if (opts.year) return parseYear(opts.year);
  if (opts.from && opts.to) return { from: opts.from, to: opts.to };
  const now = new Date();
  return parseMonth(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`);
}

function rangeLabel(range: DateRange, opts: CliOptions): string {
  if (opts.month) return opts.month;
  if (opts.year) return opts.year;
  return `${range.from} → ${range.to}`;
}

function writeOutput(content: string, path?: string): void {
  if (!path || path === "-") {
    console.log(content);
    return;
  }
  writeFileSync(path, content, "utf8");
  console.error(`  Wrote ${path}`);
}

function tokenSourceLabel(): string {
  if (process.env.GITHUB_TOKEN) return "GITHUB_TOKEN";
  if (process.env.GH_TOKEN) return "GH_TOKEN";
  return "--token";
}

function assertForge(forge: ForgeId): void {
  if (forge !== "github") throw unsupportedForgeError(forge);
}

function parseUserList(filePath: string): string[] {
  const raw = readFileSync(filePath, "utf8");
  return raw
    .split(/[\s,]+/)
    .map((u) => u.replace(/^@/, "").trim())
    .filter(Boolean);
}

function cardUrl(kind: "share" | "portfolio", encoded: string): string {
  const path = kind === "portfolio" ? `#/portfolio/${encoded}` : `#/share/${encoded}`;
  return `${SITE_BASE}${path}`;
}

async function runDoctor(): Promise<void> {
  const status = await checkRateLimit();
  printDoctor({
    version: cliVersion(),
    node: process.version,
    authenticated: status.authenticated,
    tokenSource: status.authenticated ? tokenSourceLabel() : "none",
    core: status.core,
    search: status.search,
  });
}

async function auditUser(
  username: string,
  range: DateRange,
  onProgress?: (msg: string) => void
): Promise<FullAuditResult> {
  return runFullAudit(username, range, runAudit, onProgress);
}

function aiProviderFor(opts: CliOptions) {
  return createLLMClient({ provider: opts.aiProvider, model: opts.aiModel });
}

async function maybeAISummary(
  insights: AuditInsights,
  username: string,
  label: string,
  opts: CliOptions
): Promise<AuditSummary | undefined> {
  if (!opts.aiSummary) return undefined;
  try {
    return await generateAuditSummary(
      insights,
      `@${username} · ${label}`,
      aiProviderFor(opts),
      { tone: opts.aiTone }
    );
  } catch (err) {
    printError(`AI summary failed: ${err instanceof Error ? err.message : String(err)}`);
    return undefined;
  }
}

function withSummary(json: string, summary?: AuditSummary): string {
  if (!summary) return json;
  const obj = JSON.parse(json) as Record<string, unknown>;
  obj.aiSummary = summary;
  return JSON.stringify(obj, null, 2);
}

async function main(): Promise<void> {
  const opts = parseArgs(process.argv.slice(2));

  if (opts.version) {
    console.log(cliVersion());
    process.exit(0);
  }
  if (opts.help) {
    console.log(usage());
    process.exit(0);
  }
  if (opts.token) setAuthToken(opts.token);

  try {
    if (opts.command === "forges") {
      console.log("");
      console.log(`  ${githubForge.label.padEnd(12)} ${githubForge.supported ? "live" : "stub"}`);
      console.log(`  ${gitlabForge.label.padEnd(12)} stub — see docs/architecture-multi-forge.md`);
      console.log(`  ${bitbucketForge.label.padEnd(12)} stub — see docs/architecture-multi-forge.md`);
      console.log("");
      return;
    }

    if (opts.command === "doctor") {
      await runDoctor();
      return;
    }

    if (opts.command === "auth") {
      const sub = (opts.username || "status").toLowerCase();
      if (sub === "init" || sub === "help") {
        console.log(authSetupInstructions());
        return;
      }
      if (sub === "status" || sub === "") {
        const result = await validateAuth();
        printBanner();
        console.log(`  Auth status · ${result.message}`);
        console.log("");
        if (!result.authenticated) console.log(authSetupInstructions());
        return;
      }
      if (sub === "login") {
        printBanner();
        const started = await startDeviceFlow();
        console.log(`  Open ${started.verification_uri}`);
        console.log(`  Enter code: ${started.user_code}`);
        console.log("  Waiting for authorization…");
        const token = await pollDeviceToken(started.device_code, undefined, started.interval || 5);
        setAuthToken(token);
        console.log("");
        console.log("  Login OK. Export for this shell:");
        console.log(`  export GITHUB_TOKEN=${token}`);
        console.log("");
        const result = await validateAuth(token);
        console.log(`  ${result.message}`);
        console.log("");
        return;
      }
      console.log(authSetupInstructions());
      return;
    }

    if (opts.command === "config") {
      const sub = (opts.username || "show").toLowerCase();
      const example = exampleConfigYaml();
      if (sub === "init") {
        const target = opts.configPath || "openhearth.yml";
        writeFileSync(target, example, "utf8");
        console.error(`  Wrote ${target}`);
        return;
      }
      console.log(example);
      return;
    }

    if (opts.command === "run") {
      const confPath = opts.configPath;
      let text: string;
      let labelPath: string;
      if (confPath) {
        text = readFileSync(confPath, "utf8");
        labelPath = confPath;
      } else {
        const candidates = ["openhearth.yml", "openhearth.yaml", "openhearth.json"];
        const hit = candidates.find((n) => {
          try { readFileSync(n); return true; } catch { return false; }
        });
        if (!hit) throw new Error("No openhearth.yml found. Run: openhearth config init");
        text = readFileSync(hit, "utf8");
        labelPath = hit;
      }
      const cfg = parseConfigText(text, labelPath);
      if (cfg.month) opts.month = cfg.month;
      if (cfg.year) opts.year = cfg.year;
      if (cfg.from) opts.from = cfg.from;
      if (cfg.to) opts.to = cfg.to;
      if (cfg.forge) opts.forge = cfg.forge as ForgeId;
      assertForge(opts.forge);
      const range = resolveRange(opts);
      const label = rangeLabel(range, opts);
      if (!opts.quiet) {
        printBanner();
        console.log(`  Config run · ${labelPath} · ${cfg.users.length} users · ${label}\n`);
      }
      for (const user of cfg.users) {
        const full = await auditUser(user, range, opts.quiet ? undefined : printProgress);
        if (!opts.quiet) printRadarRow(user, full.insights);
      }
      return;
    }

    if (opts.command === "digest") {
      const path = opts.usersFile;
      if (!path) {
        console.log(usage());
        process.exit(1);
      }
      const data = JSON.parse(readFileSync(path, "utf8")) as {
        username?: string;
        range?: DateRange;
        insights?: AuditInsights;
      };
      if (!data.insights || !data.username) {
        throw new Error("JSON must be a full audit export (username + insights).");
      }
      const label = data.range ? `${data.range.from} → ${data.range.to}` : "audit";
      const md = formatDigestMarkdown({
        username: data.username,
        label,
        insights: data.insights,
        appUrl: SITE_BASE + "#/app",
      });
      console.log(md);
      console.error("");
      console.error(formatDigestPlain({ username: data.username, label, insights: data.insights }));
      if (opts.aiSummary) {
        const summary = await maybeAISummary(data.insights, data.username, label, opts);
        if (summary) {
          console.error("");
          printAISummary(summary);
        }
      }
      return;
    }

    assertForge(opts.forge);

    if (opts.command === "radar") {
      if (!opts.usersFile) throw new Error("radar requires --users-file PATH");
      const users = parseUserList(opts.usersFile);
      if (users.length === 0) throw new Error("No usernames found in users file.");
      const range = resolveRange(opts);
      const label = rangeLabel(range, opts);
      if (!opts.quiet) {
        printBanner();
        console.log(`  Team radar · ${users.length} users · ${label}\n`);
      }
      const rows: Array<{ username: string; insights: AuditInsights }> = [];
      for (const user of users) {
        const full = await auditUser(user, range, opts.quiet ? undefined : printProgress);
        rows.push({ username: user, insights: full.insights });
        if (!opts.quiet) printRadarRow(user, full.insights);
        if (opts.json === "-") writeOutput(fullAuditToJson(full), "-");
      }
      if (opts.json && opts.json !== "-") {
        writeOutput(JSON.stringify(rows, null, 2), opts.json);
      }
      return;
    }

    if (opts.command === "overlap") {
      if (!opts.username || !opts.usernameB) {
        console.log(usage());
        process.exit(1);
      }
      const range = resolveRange(opts);
      const label = rangeLabel(range, opts);
      if (!opts.quiet) printBanner();
      const a = await auditUser(opts.username, range, opts.quiet ? undefined : printProgress);
      const b = await auditUser(opts.usernameB, range, opts.quiet ? undefined : printProgress);
      const overlap = computeRepoOverlap(opts.username, a.insights, opts.usernameB, b.insights);
      if (!opts.quiet) {
        printInsights(a.insights, `@${opts.username} · ${label}`);
        printInsights(b.insights, `@${opts.usernameB} · ${label}`);
        printOverlap(overlap);
      }
      if (opts.json) writeOutput(JSON.stringify(overlap, null, 2), opts.json);
      return;
    }

    if (opts.command === "lens") {
      if (!opts.username || !opts.repo) {
        console.log(usage());
        process.exit(1);
      }
      const range =
        opts.month || opts.year || (opts.from && opts.to) ? resolveRange(opts) : defaultLensRange();
      if (!opts.quiet) printBanner();
      const result = await runRepoLens(
        opts.username,
        opts.repo,
        range,
        opts.quiet ? undefined : printProgress
      );
      if (!opts.quiet) printLens(result);
      if (opts.json) writeOutput(JSON.stringify(result, null, 2), opts.json);
      return;
    }

    if (
      !opts.username &&
      !["doctor", "forges", "auth", "config", "run", "radar", "digest"].includes(opts.command)
    ) {
      console.log(usage());
      process.exit(1);
    }

    const range = resolveRange(opts);
    const label = rangeLabel(range, opts);
    const onProgress = opts.quiet ? undefined : printProgress;
    if (!opts.quiet) printBanner();

    if (opts.command === "proof" || opts.command === "hidden") {
      const full = await auditUser(opts.username, range, onProgress);
      const proof = buildFeedSearchProof(full.insights);
      let explanations: HiddenRepoExplanation[] | undefined;
      let narration: ProofNarration | undefined;
      if (!opts.quiet) {
        printInsights(full.insights, `@${opts.username} · ${label}`);
        if (opts.command === "proof") {
          printProof(proof);
          if (opts.aiSummary) {
            narration = buildProofNarration(proof, full.insights);
            printProofNarration(narration);
          }
        } else {
          printLikelyHidden(full.insights);
          if (opts.aiExplain) {
            explanations = buildHiddenRepoExplanations(full.insights);
            printHiddenExplanations(explanations);
          }
          console.log(`  ${full.insights.feedTruncationNote}\n`);
        }
      }
      const summary = await maybeAISummary(full.insights, full.username, label, opts);
      if (summary && !opts.quiet) printAISummary(summary);
      if (opts.json || opts.csv) {
        let json = fullAuditToJson(full);
        if (summary) json = withSummary(json, summary);
        if (explanations || narration) {
          const obj = JSON.parse(json) as Record<string, unknown>;
          if (explanations) obj.hiddenRepoExplanations = explanations;
          if (narration) obj.proofNarration = narration;
          json = JSON.stringify(obj, null, 2);
        }
        if (opts.json) writeOutput(json, opts.json);
        if (opts.csv) writeOutput(fullAuditToCsv(full), opts.csv);
      }
      return;
    }

    if (opts.command === "share" || opts.command === "portfolio") {
      const full = await auditUser(opts.username, range, onProgress);
      const card =
        opts.command === "portfolio"
          ? buildPortfolioCard(opts.username, label, full.insights)
          : buildReportCard(opts.username, label, full.insights);
      let url: string;
      let gist: GistReport | undefined;
      if (opts.gist) {
        gist = await createReportGist(card);
        url = `${SITE_BASE}#/r/${gist.id}`;
        console.log(url);
        console.error(`  Gist: ${gist.htmlUrl}`);
      } else {
        const encoded = encodeCardPayload(card);
        url = cardUrl(opts.command === "portfolio" ? "portfolio" : "share", encoded);
        console.log(url);
      }
      let summary: AuditSummary | undefined;
      let caption: ShareCaption | undefined;
      if (opts.aiSummary) {
        summary = await maybeAISummary(full.insights, full.username, label, opts);
        if (summary) {
          caption = buildShareCaption(summary, url);
          console.error("");
          console.error(`  Caption (${caption.platform}):`);
          for (const line of caption.text.split("\n")) console.error(`  ${line}`);
          console.error("");
        }
      }
      if (opts.json) {
        const out: Record<string, unknown> = { url, card };
        if (gist) out.gist = gist;
        if (summary) out.aiSummary = summary;
        if (caption) out.caption = caption;
        writeOutput(JSON.stringify(out, null, 2), opts.json);
      }
      return;
    }

    // audit (default) — full audit when --kind all OR --ai-summary (summary needs insights)
    if (opts.kind === "all" || opts.aiSummary) {
      const full = await auditUser(opts.username, range, onProgress);
      const summary = await maybeAISummary(full.insights, full.username, label, opts);
      if (opts.json) writeOutput(withSummary(fullAuditToJson(full), summary), opts.json);
      if (opts.csv) writeOutput(fullAuditToCsv(full), opts.csv);
      if (!opts.quiet && !opts.json && !opts.csv) {
        if (opts.kind === "all") {
          printFullReport(full, label);
        } else {
          const kindResult =
            opts.kind === "pr" ? full.pullRequests : opts.kind === "issue" ? full.issues : full.reviews;
          printAuditSection(
            opts.kind === "pr" ? "Pull requests" : opts.kind === "issue" ? "Issues" : "Reviews",
            kindResult
          );
        }
        if (summary) printAISummary(summary);
      }
      return;
    }

    const result = await runAudit(opts.username, opts.kind, range, onProgress);
    if (opts.json) writeOutput(auditToJson(result), opts.json);
    if (opts.csv) writeOutput(auditToCsv(result), opts.csv);
    if (!opts.quiet && !opts.json && !opts.csv) {
      printAuditSection(
        opts.kind === "pr" ? "Pull requests" : opts.kind === "issue" ? "Issues" : "Reviews",
        result
      );
    }

    if (opts.command === "agent") {
      const tool = opts.agentTool;
      if (!tool) {
        console.log(usage());
        process.exit(1);
      }
      const allowed = new Set<AgentToolName>([
        "run_audit",
        "run_hidden",
        "run_proof",
        "compare_users",
        "lens_repo",
        "publish_gist_report",
        "write_digest",
        "ask_summary",
      ]);
      if (!allowed.has(tool as AgentToolName)) {
        throw new Error(`Unknown agent tool: ${tool}`);
      }
      const ctx: AgentRunContext = {
        token: opts.token,
        aiProvider: opts.aiProvider,
        aiModel: opts.aiModel,
        aiTone: opts.aiTone,
        dryRun: argv.includes("--dry-run"),
        tokenBudget: argv.includes("--budget") ? Number(argv[argv.indexOf("--budget") + 1]) : undefined,
        approvalRequired: true,
      };
      const args: Record<string, unknown> = {
        username: opts.username,
        userA: opts.username,
        userB: opts.usernameB,
        repo: opts.repo,
        month: opts.month,
        year: opts.year,
        from: opts.from,
        to: opts.to,
        approve: argv.includes("--approve") ? "true" : "false",
        tone: opts.aiTone,
      };
      const transcript = createAgentTranscript({ tool, args });
      const result = await runAgentTool(tool as AgentToolName, args, ctx, transcript);
      if (opts.json) {
        writeOutput(JSON.stringify({ result, transcript }, null, 2), opts.json);
      } else {
        console.log(JSON.stringify({ result, transcript }, null, 2));
      }
      return;
    }

    if (opts.command === "mcp") {
      const ctx: McpContext = {
        token: opts.token,
        aiProvider: opts.aiProvider,
        aiModel: opts.aiModel,
        aiTone: opts.aiTone,
        port: opts.mcpPort,
      };
      startMcpServer(ctx);
      return;
    }
  } catch (err) {
    printError(err instanceof Error ? err.message : String(err));
    if (!getAuthToken()) {
      printProgress("Hint: run `openhearth doctor` after setting GITHUB_TOKEN.");
    }
    process.exit(1);
  }
}

main();
