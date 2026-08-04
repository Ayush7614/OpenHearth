import type {
  AISafetyCard,
  AuditResult,
  AuditInsights,
  AuditSummary,
  FullAuditResult,
  HiddenRepoExplanation,
  ProofNarration,
} from "@felix-ayush/openhearth-core";

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

export function printProof(proof: {
  headline: string;
  feedCap: number;
  feedWouldShow: Array<{ repo: string; count: number }>;
  searchFound: {
    totalRepos: number;
    totalContributions: number;
    likelyHidden: Array<{ repo: string; count: number }>;
  };
}): void {
  console.log(bold("  Feed vs Search proof"));
  console.log(dim(`  ${proof.headline}`));
  console.log("");
  console.log(bold("  Activity feed would likely show") + dim(` · top of ~${proof.feedCap}`));
  for (const { repo, count } of proof.feedWouldShow.slice(0, 10)) {
    console.log(`  ${dim("·")} ${repo} ${dim(String(count))}`);
  }
  if (proof.feedWouldShow.length === 0) console.log(dim("  (none)"));
  console.log("");
  console.log(
    bold("  Search API found") +
      dim(` · ${proof.searchFound.totalRepos} repos · ${proof.searchFound.totalContributions} contribs`)
  );
  if (proof.searchFound.likelyHidden.length === 0) {
    console.log(dim("  No likely-hidden repos past the sidebar cap."));
  } else {
    console.log(amber("  Likely truncated (least activity first):"));
    for (const { repo, count } of proof.searchFound.likelyHidden.slice(0, 15)) {
      console.log(`  ${dim("·")} ${repo} ${dim(String(count))}`);
    }
  }
  console.log("");
}

export function printOverlap(result: {
  userA: string;
  userB: string;
  sharedRepos: Array<{ repo: string; count: number }>;
  onlyA: string[];
  onlyB: string[];
}): void {
  console.log(bold("  Cross-user overlap") + dim(` · @${result.userA} ∩ @${result.userB}`));
  console.log("");
  if (result.sharedRepos.length === 0) {
    console.log(dim("  No shared repos in insight snapshots."));
  } else {
    console.log(bold("  Shared repositories"));
    for (const { repo, count } of result.sharedRepos.slice(0, 20)) {
      console.log(`  ${dim("·")} ${repo} ${dim(String(count))}`);
    }
  }
  console.log("");
  console.log(dim(`  Only @${result.userA}: ${result.onlyA.length} · Only @${result.userB}: ${result.onlyB.length}`));
  console.log("");
}

export function printLens(result: {
  username: string;
  repo: string;
  range: { from: string; to: string };
  asAuthor: { total: number };
  asReviewer: { total: number };
  totalTouches: number;
  roleHint: string;
}): void {
  console.log(bold("  Repo contributor lens") + dim(` · ${result.repo}`));
  console.log(`  User                 @${result.username}`);
  console.log(`  Range                ${result.range.from} → ${result.range.to}`);
  console.log(`  Authored             ${bold(String(result.asAuthor.total))}`);
  console.log(`  Reviews              ${bold(String(result.asReviewer.total))}`);
  console.log(`  Total touches        ${bold(String(result.totalTouches))}`);
  console.log(`  Role hint            ${amber(result.roleHint)}`);
  console.log("");
}

export function printRadarRow(username: string, insights: {
  totalContributions: number;
  uniqueRepos: number;
  reposHiddenByFeed: number;
  mergeRate: number;
}): void {
  console.log(
    `  @${username.padEnd(16)} total ${String(insights.totalContributions).padStart(4)} · repos ${String(insights.uniqueRepos).padStart(3)} · hidden ~${String(insights.reposHiddenByFeed).padStart(3)} · merge ${insights.mergeRate}%`
  );
}

export function printAISafetyCard(card: AISafetyCard): void {
  console.log(bold("  AI safety card") + dim(` · ${card.provider}/${card.model}`));
  console.log(
    dim(`  ${card.localOnly ? "Local-only" : "Cloud provider"} · ${card.whatLeavesMachine}`)
  );
  console.log(dim(`  ${card.tokensNeverSent}`));
  console.log(dim(`  ${card.transparencyDisclosure}`));
  console.log("");
}

export function printAISummary(summary: AuditSummary): void {
  console.log(
    bold("  AI summary") +
      dim(` · ${summary.provider}/${summary.model} · ${summary.generatedAt}`)
  );
  console.log("");
  for (const line of summary.text.split("\n")) {
    console.log(`  ${line}`);
  }
  console.log("");
  printAISafetyCard(summary.safetyCard);
}

const SEVERITY_COLOR: Record<string, (s: string) => string> = {
  high: red,
  medium: amber,
  low: dim,
};

export function printHiddenExplanations(explanations: HiddenRepoExplanation[]): void {
  if (explanations.length === 0) return;
  console.log(bold("  Why these repos are likely hidden") + dim(" · --ai-explain"));
  console.log("");
  for (const ex of explanations.slice(0, 10)) {
    const sev = SEVERITY_COLOR[ex.severity] ?? dim;
    console.log(`  ${sev("▸")} ${ex.repo} ${dim(`(${ex.count})`)}`);
    for (const reason of ex.reasons) {
      console.log(`      ${dim("·")} ${dim(reason)}`);
    }
  }
  if (explanations.length > 10) {
    console.log(dim(`  … and ${explanations.length - 10} more`));
  }
  console.log("");
}

export function printProofNarration(narration: ProofNarration): void {
  console.log(bold("  Proof narration") + dim(` · ${narration.headline}`));
  console.log("");
  for (const line of narration.body) {
    console.log(`  ${dim(line)}`);
    console.log("");
  }
  console.log(`  ${amber(narration.verdict)}`);
  console.log("");
}
