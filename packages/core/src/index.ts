export {
  ACTIVITY_FEED_REPO_CAP,
  GitHubApiError,
  checkRateLimit,
  getAuthToken,
  getRateLimit,
  repoFullNameFromUrl,
  searchIssuesAll,
  searchIssuesPage,
  setAuthToken,
  type RateLimitInfo,
  type SearchIssueItem,
} from "./github.js";

export {
  aggregateByRepo,
  fetchAllForRange,
  runAudit,
  toContribution,
  type AuditResult,
  type ContributionItem,
  type RepoBucket,
} from "./aggregate.js";

export {
  buildSearchQuery,
  formatDate,
  monthRange,
  parseMonth,
  rangeDayCount,
  splitRange,
  type AuditKind,
  type DateRange,
} from "./queries.js";

export {
  buildInsights,
  runFullAudit,
  type AuditInsights,
  type FullAuditResult,
  type RepoCount,
} from "./insights.js";

export {
  auditToCsv,
  auditToJson,
  fullAuditToCsv,
  fullAuditToJson,
} from "./export.js";

export const APP_NAME = "OpenHearth";
export const APP_TAGLINE =
  "A cozy open-source contribution audit — find every PR, issue, and review GitHub's activity feed hides.";
