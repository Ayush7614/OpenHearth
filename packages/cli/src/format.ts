import type {
  AISafetyCard,
  AuditResult,
  AuditInsights,
  AuditSummary,
  FullAuditResult,
  HiddenRepoExplanation,
  ProofNarration,
} from "@felix-ayush/openhearth-core";
import { renderBanner } from "./banner.js";

const dim = (s: string) => `\x1b[2m${s}\x1b[0m`;
const bold = (s: string) => `\x1b[1m${s}\x1b[0m`;
const red = (s: string) => `\x1b[31m${s}\x1b[0m`;
const green = (s: string) => `\x1b[32m${s}\x1b[0m`;
const brand = (s: string) => `\x1b[38;5;196m${s}\x1b[0m`;

export function printBanner(version?: string): void {
  const banner = renderBanner(version);
  process.stdout.write(banner + "\n");
}

export function printInsights(insights: AuditInsights, rangeLabel: string): void {
  console.log(bold("  SUMMARY") + dim(` · ${rangeLabel.toUpperCase()}`));
  console.log("");
  console.log(`  TOTAL CONTRIBUTIONS   ${bold(String(insights.totalContributions))}`);
  console.log(`  UNIQUE REPOSITORIES   ${bold(String(insights.uniqueRepos))}`);
  console.log(`  PR MERGE RATE         ${bold(`${insights.mergeRate}%`)}`);
  console.log(
    `  BY KIND               PRS ${insights.byKind.pr} · ISSUES ${insights.byKind.issue} · REVIEWS ${insights.byKind.review}`
  );
  if (insights.busiestDay) {
    console.log(`  BUSIEST DAY           ${insights.busiestDay}`);
  }
  console.log("");

  if (insights.reposHiddenByFeed > 0) {
    console.log(brand("  ⚠ HIDDEN BY ACTIVITY FEED"));
    console.log(
      dim(
        `  FEED SHOWS ~${insights.reposVisibleOnFeed} BUSIEST REPOS; SEARCH API FOUND ${insights.uniqueRepos}.`
      )
    );
    console.log(
      dim(`  ~${insights.reposHiddenByFeed} LOWER-ACTIVITY REPOSITORIES ARE LIKELY TRUNCATED.`)
    );
    console.log("");
  }

  if (insights.topRepos.length > 0) {
    console.log(bold("  TOP REPOSITORIES") + dim(" · LIKELY VISIBLE ON FEED"));
    for (const { repo, count } of insights.topRepos.slice(0, 8)) {
      console.log(`  ${dim("·")} ${repo} ${dim(String(count))}`);
    }
    console.log("");
  }
}

export function printLikelyHidden(insights: AuditInsights, limit = 20): void {
  if (insights.likelyHiddenRepos.length === 0) return;

  console.log(
    bold("  LIKELY HIDDEN REPOSITORIES") +
      dim(` · ${insights.likelyHiddenRepos.length} PAST THE ~${insights.reposVisibleOnFeed} SIDEBAR CAP`)
  );
  console.log(dim("  RANKED LEAST ACTIVITY FIRST (MOST LIKELY TRUNCATED)."));
  console.log("");

  for (const { repo, count } of insights.likelyHiddenRepos.slice(0, limit)) {
    console.log(`  ${dim("·")} ${repo} ${dim(String(count))}`);
  }
  if (insights.likelyHiddenRepos.length > limit) {
    console.log(dim(`  … AND ${insights.likelyHiddenRepos.length - limit} MORE`));
  }
  console.log("");
}

export function printAuditSection(title: string, result: AuditResult): void {
  console.log(bold(`  ${title.toUpperCase()}`) + dim(` · ${result.total} ACROSS ${result.repos.length} REPOS`));
  if (result.repos.length === 0) {
    console.log(dim("  (NONE)"));
    console.log("");
    return;
  }
  for (const repo of result.repos.slice(0, 6)) {
    const parts = [
      repo.merged ? green(`${repo.merged} MERGED`) : "",
      repo.open ? `${repo.open} OPEN` : "",
      repo.closed ? dim(`${repo.closed} CLOSED`) : "",
    ].filter(Boolean);
    console.log(`  ${dim("▸")} ${repo.repo} ${dim(parts.join(" · "))}`);
  }
  if (result.repos.length > 6) {
    console.log(dim(`  … AND ${result.repos.length - 6} MORE REPOSITORIES`));
  }
  console.log("");
}

export function printFullReport(result: FullAuditResult, rangeLabel: string): void {
  printInsights(result.insights, `@${result.username} · ${rangeLabel}`);
  printLikelyHidden(result.insights, 12);
  printAuditSection("PULL REQUESTS", result.pullRequests);
  printAuditSection("ISSUES", result.issues);
  printAuditSection("REVIEWS", result.reviews);
  console.log(dim(`  ${result.insights.feedTruncationNote.toUpperCase()}`));
  console.log("");
}

export function printError(message: string): void {
  const lines = message.split("\n");
  console.error("");
  console.error(red(`  ERROR: ${lines[0].toUpperCase()}`));
  for (const line of lines.slice(1)) {
    console.error(line.length ? dim(`  ${line.toUpperCase()}`) : "");
  }
  console.error("");
}

export function printProgress(message: string): void {
  console.error(dim(`  ${message.toUpperCase()}`));
}

function formatReset(reset: number): string {
  if (!reset) return "UNKNOWN";
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
  console.log(bold("  DOCTOR") + dim(" · ENVIRONMENT CHECK"));
  console.log("");
  console.log(`  CLI VERSION           ${report.version}`);
  console.log(`  NODE.JS               ${report.node}`);
  console.log(
    `  AUTH                  ${
      report.authenticated
        ? green(`YES (${report.tokenSource.toUpperCase()})`)
        : brand("NO — UNAUTHENTICATED")
    }`
  );
  console.log("");
  console.log(bold("  RATE LIMITS"));
  console.log(
    `  CORE API              ${report.core.remaining}/${report.core.limit}  RESET ${formatReset(report.core.reset)}`
  );
  console.log(
    `  SEARCH API            ${report.search.remaining}/${report.search.limit}  RESET ${formatReset(report.search.reset)}`
  );
  console.log("");
  if (!report.authenticated) {
    console.log(brand("  TIP: EXPORT GITHUB_TOKEN=… BEFORE RUNNING AUDITS."));
    console.log(dim("  HTTPS://GITHUB.COM/SETTINGS/TOKENS"));
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
  console.log(bold("  FEED VS SEARCH PROOF"));
  console.log(dim(`  ${proof.headline.toUpperCase()}`));
  console.log("");
  console.log(bold("  ACTIVITY FEED WOULD LIKELY SHOW") + dim(` · TOP OF ~${proof.feedCap}`));
  for (const { repo, count } of proof.feedWouldShow.slice(0, 10)) {
    console.log(`  ${dim("·")} ${repo} ${dim(String(count))}`);
  }
  if (proof.feedWouldShow.length === 0) console.log(dim("  (NONE)"));
  console.log("");
  console.log(
    bold("  SEARCH API FOUND") +
      dim(` · ${proof.searchFound.totalRepos} REPOS · ${proof.searchFound.totalContributions} CONTRIBS`)
  );
  if (proof.searchFound.likelyHidden.length === 0) {
    console.log(dim("  NO LIKELY-HIDDEN REPOS PAST THE SIDEBAR CAP."));
  } else {
    console.log(brand("  LIKELY TRUNCATED (LEAST ACTIVITY FIRST):"));
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
  console.log(bold("  CROSS-USER OVERLAP") + dim(` · @${result.userA} ∩ @${result.userB}`));
  console.log("");
  if (result.sharedRepos.length === 0) {
    console.log(dim("  NO SHARED REPOS IN INSIGHT SNAPSHOTS."));
  } else {
    console.log(bold("  SHARED REPOSITORIES"));
    for (const { repo, count } of result.sharedRepos.slice(0, 20)) {
      console.log(`  ${dim("·")} ${repo} ${dim(String(count))}`);
    }
  }
  console.log("");
  console.log(
    dim(`  ONLY @${result.userA}: ${result.onlyA.length} · ONLY @${result.userB}: ${result.onlyB.length}`)
  );
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
  console.log(bold("  REPO CONTRIBUTOR LENS") + dim(` · ${result.repo}`));
  console.log(`  USER                 @${result.username}`);
  console.log(`  RANGE                ${result.range.from} → ${result.range.to}`);
  console.log(`  AUTHORED             ${bold(String(result.asAuthor.total))}`);
  console.log(`  REVIEWS              ${bold(String(result.asReviewer.total))}`);
  console.log(`  TOTAL TOUCHES        ${bold(String(result.totalTouches))}`);
  console.log(`  ROLE HINT            ${brand(result.roleHint.toUpperCase())}`);
  console.log("");
}

export function printRadarRow(
  username: string,
  insights: {
    totalContributions: number;
    uniqueRepos: number;
    reposHiddenByFeed: number;
    mergeRate: number;
  }
): void {
  console.log(
    `  @${username.padEnd(16)} TOTAL ${String(insights.totalContributions).padStart(4)} · REPOS ${String(insights.uniqueRepos).padStart(3)} · HIDDEN ~${String(insights.reposHiddenByFeed).padStart(3)} · MERGE ${insights.mergeRate}%`
  );
}

export function printAISafetyCard(card: AISafetyCard): void {
  console.log(bold("  AI SAFETY CARD") + dim(` · ${card.provider}/${card.model}`.toUpperCase()));
  console.log(
    dim(
      `  ${(card.localOnly ? "LOCAL-ONLY" : "CLOUD PROVIDER")} · ${card.whatLeavesMachine.toUpperCase()}`
    )
  );
  console.log(dim(`  ${card.tokensNeverSent.toUpperCase()}`));
  console.log(dim(`  ${card.transparencyDisclosure.toUpperCase()}`));
  console.log("");
}

export function printAISummary(summary: AuditSummary): void {
  console.log(
    bold("  AI SUMMARY") +
      dim(` · ${summary.provider}/${summary.model} · ${summary.generatedAt}`.toUpperCase())
  );
  console.log("");
  for (const line of summary.text.split("\n")) {
    console.log(`  ${line.toUpperCase()}`);
  }
  console.log("");
  printAISafetyCard(summary.safetyCard);
}

const SEVERITY_COLOR: Record<string, (s: string) => string> = {
  high: red,
  medium: brand,
  low: dim,
};

export function printHiddenExplanations(explanations: HiddenRepoExplanation[]): void {
  if (explanations.length === 0) return;
  console.log(bold("  WHY THESE REPOS ARE LIKELY HIDDEN") + dim(" · --AI-EXPLAIN"));
  console.log("");
  for (const ex of explanations.slice(0, 10)) {
    const sev = SEVERITY_COLOR[ex.severity] ?? dim;
    console.log(`  ${sev("▸")} ${ex.repo} ${dim(`(${ex.count})`)}`);
    for (const reason of ex.reasons) {
      console.log(`      ${dim("·")} ${dim(reason.toUpperCase())}`);
    }
  }
  if (explanations.length > 10) {
    console.log(dim(`  … AND ${explanations.length - 10} MORE`));
  }
  console.log("");
}

export function printProofNarration(narration: ProofNarration): void {
  console.log(bold("  PROOF NARRATION") + dim(` · ${narration.headline.toUpperCase()}`));
  console.log("");
  for (const line of narration.body) {
    console.log(`  ${dim(line.toUpperCase())}`);
    console.log("");
  }
  console.log(`  ${brand(narration.verdict.toUpperCase())}`);
  console.log("");
}
