import type { AuditResult, AuditInsights, FullAuditResult } from "@openhearth/core";

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
        `  Feed shows ~${insights.reposVisibleOnFeed} repos; Search API found ${insights.uniqueRepos}.`
      )
    );
    console.log(
      dim(`  ~${insights.reposHiddenByFeed} repositories may not appear on your profile sidebar.`)
    );
    console.log("");
  }

  if (insights.topRepos.length > 0) {
    console.log(bold("  Top repositories"));
    for (const { repo, count } of insights.topRepos.slice(0, 8)) {
      console.log(`  ${dim("·")} ${repo} ${dim(String(count))}`);
    }
    console.log("");
  }
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
  printAuditSection("Pull requests", result.pullRequests);
  printAuditSection("Issues", result.issues);
  printAuditSection("Reviews", result.reviews);
  console.log(dim(`  ${result.insights.feedTruncationNote}`));
  console.log("");
}

export function printError(message: string): void {
  console.error(red(`\n  Error: ${message}\n`));
}

export function printProgress(message: string): void {
  console.error(dim(`  ${message}`));
}
