import {
  aggregateByRepo,
  toContribution,
  type AuditResult,
} from "./aggregate.js";
import { searchIssuesAll } from "./github.js";
import { formatDate, type DateRange } from "./queries.js";

export type RepoLensResult = {
  username: string;
  repo: string;
  range: DateRange;
  asAuthor: AuditResult;
  asReviewer: AuditResult;
  totalTouches: number;
  roleHint: string;
};

function buildRepoAuthorQuery(username: string, repo: string, range: DateRange): string {
  return `repo:${repo} author:${username} created:${range.from}..${range.to}`;
}

function buildRepoReviewQuery(username: string, repo: string, range: DateRange): string {
  return `repo:${repo} reviewed-by:${username} is:pr created:${range.from}..${range.to}`;
}

function toAuditResult(
  kind: "pr" | "issue" | "review",
  username: string,
  range: DateRange,
  items: ReturnType<typeof toContribution>[]
): AuditResult {
  return {
    kind,
    username,
    range,
    total: items.length,
    repos: aggregateByRepo(items),
    items,
  };
}

/** Contributor lens: how a user touches one repository in a date range. */
export async function runRepoLens(
  username: string,
  repo: string,
  range: DateRange,
  onProgress?: (msg: string) => void
): Promise<RepoLensResult> {
  const clean = repo.replace(/^https?:\/\/github\.com\//, "").replace(/\.git$/, "");
  if (!/^[^/]+\/[^/]+$/.test(clean)) {
    throw new Error(`Invalid repo "${repo}". Use OWNER/NAME.`);
  }

  onProgress?.(`Lens · authored in ${clean}…`);
  const authoredRaw = await searchIssuesAll(buildRepoAuthorQuery(username, clean, range));
  onProgress?.(`Lens · reviews in ${clean}…`);
  const reviewedRaw = await searchIssuesAll(buildRepoReviewQuery(username, clean, range));

  const authored = authoredRaw.items.map((item) =>
    toContribution(item, item.pull_request ? "pr" : "issue")
  );
  const reviewed = reviewedRaw.items.map((item) => toContribution(item, "review"));

  // Force repo name from lens target (search items may vary)
  for (const item of [...authored, ...reviewed]) item.repo = clean;

  const asAuthor = toAuditResult("pr", username, range, authored);
  const asReviewer = toAuditResult("review", username, range, reviewed);
  const totalTouches = asAuthor.total + asReviewer.total;

  let roleHint = "Drive-by or light touch";
  if (totalTouches >= 20 || asAuthor.total >= 10) roleHint = "Core / frequent contributor";
  else if (totalTouches >= 5) roleHint = "Regular contributor";
  else if (asReviewer.total > asAuthor.total) roleHint = "Mostly reviewing";

  return {
    username,
    repo: clean,
    range,
    asAuthor,
    asReviewer,
    totalTouches,
    roleHint,
  };
}

export function defaultLensRange(): DateRange {
  const end = new Date();
  const start = new Date(end);
  start.setFullYear(start.getFullYear() - 1);
  return { from: formatDate(start), to: formatDate(end) };
}
