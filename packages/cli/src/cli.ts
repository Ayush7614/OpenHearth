import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import {
  APP_NAME,
  auditToCsv,
  auditToJson,
  bitbucketForge,
  buildFeedSearchProof,
  buildPortfolioCard,
  buildReportCard,
  checkRateLimit,
  computeRepoOverlap,
  defaultLensRange,
  encodeCardPayload,
  formatDigestMarkdown,
  formatDigestPlain,
  fullAuditToCsv,
  fullAuditToJson,
  getAuthToken,
  githubForge,
  gitlabForge,
  parseMonth,
  parseYear,
  runAudit,
  runFullAudit,
  runRepoLens,
  setAuthToken,
  unsupportedForgeError,
  type AuditInsights,
  type AuditKind,
  type DateRange,
  type ForgeId,
  type FullAuditResult,
} from "@felix-ayush/openhearth-core";
import {
  printAuditSection,
  printBanner,
  printDoctor,
  printError,
  printFullReport,
  printInsights,
  printLens,
  printLikelyHidden,
  printOverlap,
  printProgress,
  printProof,
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
  | "forges";

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
  forge: ForgeId;
  quiet: boolean;
  help: boolean;
  version: boolean;
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
  openhearth doctor
  openhearth --version

Commands:
  audit       Full PR + issue + review audit (default)
  hidden      Hidden-repo report vs activity sidebar
  proof       Feed vs Search side-by-side proof
  radar       Team/org multi-user audit from a username list
  overlap     Shared repos between two users (from live audits)
  lens        Contributor lens for one repository
  digest      Slack/Discord markdown from an audit JSON file
  share       Print a public report-card URL (Pages hash)
  portfolio   Print a hiring/portfolio card URL
  forges      List forge adapters (GitHub live; others stubbed)
  doctor      Check auth + GitHub rate-limit status

Options:
  --month YYYY-MM     Audit a calendar month (e.g. 2026-07)
  --year YYYY         Full calendar year range
  --from YYYY-MM-DD   Custom range start
  --to YYYY-MM-DD     Custom range end
  --kind pr|issue|review|all   Default: all
  --token TOKEN       GitHub PAT (or set GITHUB_TOKEN)
  --users-file PATH   Newline/comma-separated usernames (radar)
  --forge github|gitlab|bitbucket   Default: github
  --json [file]       Export JSON (stdout if no file)
  --csv [file]        Export CSV (stdout if no file)
  --quiet             Minimal output
  -V, --version       Print CLI version
  -h, --help          Show help

Examples:
  npx @felix-ayush/openhearth audit Ayush7614 --month 2026-07
  npx @felix-ayush/openhearth proof Ayush7614 --month 2026-07
  npx @felix-ayush/openhearth radar --users-file team.txt --month 2026-07
  npx @felix-ayush/openhearth lens Ayush7614 microsoft/vscode --year 2025
  npx @felix-ayush/openhearth share Ayush7614 --month 2026-07
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
]);

function parseArgs(argv: string[]): CliOptions {
  const opts: CliOptions = {
    command: "audit",
    username: "",
    usernameB: "",
    repo: "",
    kind: "all",
    forge: "github",
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
    if (arg === "--json") {
      opts.json = argv[i + 1] && !argv[i + 1].startsWith("-") ? argv[++i] : "-";
      continue;
    }
    if (arg === "--csv") {
      opts.csv = argv[i + 1] && !argv[i + 1].startsWith("-") ? argv[++i] : "-";
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

    if (!opts.username && opts.command !== "doctor") {
      console.log(usage());
      process.exit(1);
    }

    const range = resolveRange(opts);
    const label = rangeLabel(range, opts);
    const onProgress = opts.quiet ? undefined : printProgress;
    if (!opts.quiet) printBanner();

    if (opts.command === "proof" || opts.command === "hidden") {
      const full = await auditUser(opts.username, range, onProgress);
      if (!opts.quiet) {
        printInsights(full.insights, `@${opts.username} · ${label}`);
        if (opts.command === "proof") printProof(buildFeedSearchProof(full.insights));
        else {
          printLikelyHidden(full.insights);
          console.log(`  ${full.insights.feedTruncationNote}\n`);
        }
      }
      if (opts.json) writeOutput(fullAuditToJson(full), opts.json);
      if (opts.csv) writeOutput(fullAuditToCsv(full), opts.csv);
      return;
    }

    if (opts.command === "share" || opts.command === "portfolio") {
      const full = await auditUser(opts.username, range, onProgress);
      const card =
        opts.command === "portfolio"
          ? buildPortfolioCard(opts.username, label, full.insights)
          : buildReportCard(opts.username, label, full.insights);
      const encoded = encodeCardPayload(card);
      const url = cardUrl(opts.command === "portfolio" ? "portfolio" : "share", encoded);
      console.log(url);
      if (opts.json) writeOutput(JSON.stringify({ url, card }, null, 2), opts.json);
      return;
    }

    // audit (default)
    if (opts.kind === "all") {
      const full = await auditUser(opts.username, range, onProgress);
      if (opts.json) writeOutput(fullAuditToJson(full), opts.json);
      if (opts.csv) writeOutput(fullAuditToCsv(full), opts.csv);
      if (!opts.quiet && !opts.json && !opts.csv) printFullReport(full, label);
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
  } catch (err) {
    printError(err instanceof Error ? err.message : String(err));
    if (!getAuthToken()) {
      printProgress("Hint: run `openhearth doctor` after setting GITHUB_TOKEN.");
    }
    process.exit(1);
  }
}

main();
