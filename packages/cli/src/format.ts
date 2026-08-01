import type { AuditResult, AuditInsights, FullAuditResult } from "@felix-ayush/openhearth-core";

const dim = (s: string) => `\x1b[2m${s}\x1b[0m`;
const bold = (s: string) => `\x1b[1m${s}\x1b[0m`;
const amber = (s: string) => `\x1b[33m${s}\x1b[0m`;
const green = (s: string) => `\x1b[32m${s}\x1b[0m`;
const red = (s: string) => `\x1b[31m${s}\x1b[0m`;

export function printBanner(): void {
  console.log("");
  console.log(bold("  OpenHearth") + dim(" · contribution audit"));
  console.log("");
}

export function printInsights(insights: AuditInsights, rangeLabel: string): void {
  console.log(bold("  Summary") + dim(` · ${rangeLabel}`));
  console.log("");
  console.log(`  Total contributions   ${bold(String(insights.totalContributions))}`);
  console.log(`  Unique repositories   ${bold(String(insights.uniqueRepos))}`);
  console.log(`  PR merge rate         ${bold(`${insights.mergeRate}%`)}`);
  console.log(
    `  By kind               PRs ${insights.byKind.pr} · Issues ${insights.byKind.issue} · Reviews ${insights.byKind.review}`
  );
  if (insights.busiestDay) {
    console.log(`  Busiest day           ${insights.busiestDay}`);
  }
  console.log("");

  if (insights.reposHiddenByFeed > 0) {
    console.log(amber("  ⚠ Hidden by activity feed"));
    console.log(
      dim(
        `  Feed shows ~${insights.reposVisibleOnFeed} busiest repos; Search API found ${insights.uniqueRepos}.`
      )
    );
    console.log(
      dim(`  ~${insights.reposHiddenByFeed} lower-activity repositories are likely truncated.`)
    );
    console.log("");
  }

  if (insights.topRepos.length > 0) {
    console.log(bold("  Top repositories") + dim(" · likely visible on feed"));
    for (const { repo, count } of insights.topRepos.slice(0, 8)) {
      console.log(`  ${dim("·")} ${repo} ${dim(String(count))}`);
    }
    console.log("");
  }
}

export function printLikelyHidden(insights: AuditInsights, limit = 20): void {
  if (insights.likelyHiddenRepos.length === 0) return;

  console.log(
    bold("  Likely hidden repositories") +
      dim(` · ${insights.likelyHiddenRepos.length} past the ~${insights.reposVisibleOnFeed} sidebar cap`)
  );
  console.log(dim("  Ranked least activity first (most likely truncated)."));
  console.log("");

  for (const { repo, count } of insights.likelyHiddenRepos.slice(0, limit)) {
    console.log(`  ${dim("·")} ${repo} ${dim(String(count))}`);
  }
  if (insights.likelyHiddenRepos.length > limit) {
    console.log(dim(`  … and ${insights.likelyHiddenRepos.length - limit} more`));
  }
  console.log("");
}

export function printAuditSection(title: string, result: AuditResult): void {
  console.log(bold(`  ${title}`) + dim(` · ${result.total} across ${result.repos.length} repos`));
  if (result.repos.length === 0) {
    console.log(dim("  (none)"));
    console.log("");
    return;
  }
  for (const repo of result.repos.slice(0, 6)) {
    const parts = [
      repo.merged ? green(`${repo.merged} merged`) : "",
      repo.open ? `${repo.open} open` : "",
      repo.closed ? dim(`${repo.closed} closed`) : "",
    ].filter(Boolean);
    console.log(`  ${dim("▸")} ${repo.repo} ${dim(parts.join(" · "))}`);
  }
  if (result.repos.length > 6) {
    console.log(dim(`  … and ${result.repos.length - 6} more repositories`));
  }
  console.log("");
}

export function printFullReport(result: FullAuditResult, rangeLabel: string): void {
  printInsights(result.insights, `@${result.username} · ${rangeLabel}`);
  printLikelyHidden(result.insights, 12);
  printAuditSection("Pull requests", result.pullRequests);
  printAuditSection("Issues", result.issues);
  printAuditSection("Reviews", result.reviews);
  console.log(dim(`  ${result.insights.feedTruncationNote}`));
  console.log("");
}

export function printError(message: string): void {
  const lines = message.split("\n");
  console.error("");
  console.error(red(`  Error: ${lines[0]}`));
  for (const line of lines.slice(1)) {
    console.error(line.length ? dim(`  ${line}`) : "");
  }
  console.error("");
}

export function printProgress(message: string): void {
  console.error(dim(`  ${message}`));
}

function formatReset(reset: number): string {
  if (!reset) return "unknown";
  return new Date(reset * 1000).toISOString().replace(/\.\d{3}Z$/, "Z");
}

export function printDoctor(report: {
  version: string;
  node: string;
  authenticated: boolean;
  tokenSource: string;
  core: { remaining: number; limit: number; reset: number };
  search: { remaining: number; limit: number; reset: number };
}): void {
  printBanner();
  console.log(bold("  Doctor") + dim(" · environment check"));
  console.log("");
  console.log(`  CLI version           ${report.version}`);
  console.log(`  Node.js               ${report.node}`);
  console.log(
    `  Auth                  ${
      report.authenticated ? green(`yes (${report.tokenSource})`) : amber("no — unauthenticated")
    }`
  );
  console.log("");
  console.log(bold("  Rate limits"));
  console.log(
    `  Core API              ${report.core.remaining}/${report.core.limit}  reset ${formatReset(report.core.reset)}`
  );
  console.log(
    `  Search API            ${report.search.remaining}/${report.search.limit}  reset ${formatReset(report.search.reset)}`
  );
  console.log("");
  if (!report.authenticated) {
    console.log(amber("  Tip: export GITHUB_TOKEN=… before running audits."));
    console.log(dim("  https://github.com/settings/tokens"));
    console.log("");
  }
}
