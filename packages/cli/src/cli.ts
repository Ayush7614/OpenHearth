import { readFileSync } from "node:fs";
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import {
  APP_NAME,
  auditToCsv,
  auditToJson,
  checkRateLimit,
  fullAuditToCsv,
  fullAuditToJson,
  getAuthToken,
  parseMonth,
  runAudit,
  runFullAudit,
  setAuthToken,
  type AuditKind,
  type DateRange,
} from "@felix-ayush/openhearth-core";
import {
  printAuditSection,
  printBanner,
  printDoctor,
  printError,
  printFullReport,
  printInsights,
  printLikelyHidden,
  printProgress,
} from "./format.js";

type CliOptions = {
  username: string;
  month?: string;
  from?: string;
  to?: string;
  token?: string;
  kind: AuditKind | "all";
  json?: string;
  csv?: string;
  quiet: boolean;
  hidden: boolean;
  help: boolean;
  version: boolean;
  doctor: boolean;
};

function cliVersion(): string {
  // Injected by esbuild define when bundled; fallback for tsx/dev.
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
  openhearth doctor
  openhearth --version

Commands:
  audit     Full PR + issue + review audit (default)
  hidden    Hidden-repo report vs activity sidebar (ranked)
  doctor    Check auth + GitHub rate-limit status

Options:
  --month YYYY-MM     Audit a calendar month (e.g. 2026-07)
  --from YYYY-MM-DD   Custom range start
  --to YYYY-MM-DD     Custom range end
  --kind pr|issue|review|all   Default: all
  --token TOKEN       GitHub PAT (or set GITHUB_TOKEN)
  --json [file]       Export JSON (stdout if no file)
  --csv [file]        Export CSV (stdout if no file)
  --quiet             Minimal output
  -V, --version       Print CLI version
  -h, --help          Show help

Examples:
  npx @felix-ayush/openhearth audit Ayush7614 --month 2026-07
  npx @felix-ayush/openhearth hidden Ayush7614 --month 2026-07
  npx @felix-ayush/openhearth doctor
  npx @felix-ayush/openhearth audit torvalds --from 2026-01-01 --to 2026-01-31 --json report.json

Unique features:
  · Finds ALL repos via Search API (not truncated like github.com activity)
  · Ranks likely-hidden repos (lowest activity past the ~25 sidebar cap)
  · Auto-splits date ranges past GitHub's 1000-result search cap
  · Full audit: PRs + issues + reviews in one run
  · Retries briefly on Search API rate limits
  · Import JSON into browser workspaces: openhearth audit USER --json out.json
`;
}

function parseArgs(argv: string[]): CliOptions & { command: string } {
  const opts: CliOptions & { command: string } = {
    command: "audit",
    username: "",
    kind: "all",
    quiet: false,
    hidden: false,
    help: false,
    version: false,
    doctor: false,
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
    if (arg === "--json") {
      opts.json = argv[i + 1] && !argv[i + 1].startsWith("-") ? argv[++i] : "-";
      continue;
    }
    if (arg === "--csv") {
      opts.csv = argv[i + 1] && !argv[i + 1].startsWith("-") ? argv[++i] : "-";
      continue;
    }
    if (!arg.startsWith("-")) {
      positional.push(arg);
    }
  }

  if (positional[0] === "audit" || positional[0] === "hidden" || positional[0] === "doctor") {
    opts.command = positional[0];
    opts.username = (positional[1] ?? "").replace(/^@/, "");
    if (opts.command === "hidden") opts.hidden = true;
    if (opts.command === "doctor") opts.doctor = true;
  } else {
    opts.username = (positional[0] ?? "").replace(/^@/, "");
  }

  return opts;
}

function resolveRange(opts: CliOptions): DateRange {
  if (opts.month) {
    return parseMonth(opts.month);
  }
  if (opts.from && opts.to) {
    return { from: opts.from, to: opts.to };
  }
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  return parseMonth(`${year}-${String(month).padStart(2, "0")}`);
}

function rangeLabel(range: DateRange, month?: string): string {
  if (month) return month;
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

  if (opts.doctor || opts.command === "doctor") {
    try {
      await runDoctor();
    } catch (err) {
      printError(err instanceof Error ? err.message : String(err));
      process.exit(1);
    }
    return;
  }

  if (!opts.username) {
    console.log(usage());
    process.exit(1);
  }

  const range = resolveRange(opts);
  const label = rangeLabel(range, opts.month);
  const onProgress = opts.quiet ? undefined : printProgress;

  if (!opts.quiet) printBanner();

  try {
    if (opts.hidden || opts.command === "hidden") {
      const full = await runFullAudit(opts.username, range, runAudit, onProgress);
      if (!opts.quiet) {
        printInsights(full.insights, `@${opts.username} · ${label}`);
        printLikelyHidden(full.insights);
        console.log(`  ${full.insights.feedTruncationNote}\n`);
      }
      if (opts.json) writeOutput(fullAuditToJson(full), opts.json);
      if (opts.csv) writeOutput(fullAuditToCsv(full), opts.csv);
      return;
    }

    if (opts.kind === "all") {
      const full = await runFullAudit(opts.username, range, runAudit, onProgress);

      if (opts.json) writeOutput(fullAuditToJson(full), opts.json);
      if (opts.csv) writeOutput(fullAuditToCsv(full), opts.csv);

      if (!opts.quiet && !opts.json && !opts.csv) {
        printFullReport(full, label);
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
  } catch (err) {
    printError(err instanceof Error ? err.message : String(err));
    if (!getAuthToken()) {
      printProgress("Hint: run `openhearth doctor` after setting GITHUB_TOKEN.");
    }
    process.exit(1);
  }
}

main();
