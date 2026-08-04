export {
  ACTIVITY_FEED_REPO_CAP,
  GitHubApiError,
  checkRateLimit,
  getAuthToken,
  getRateLimit,
  githubJson,
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
  parseYear,
  rangeDayCount,
  splitRange,
  yearRange,
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

export { buildFeedSearchProof, type FeedSearchProof } from "./proof.js";
export { computeRepoOverlap, type OverlapResult } from "./overlap.js";
export { formatDigestMarkdown, formatDigestPlain } from "./digest.js";
export { defaultLensRange, runRepoLens, type RepoLensResult } from "./lens.js";
export {
  unsupportedForgeError,
  type ForgeClient,
  type ForgeId,
} from "./forge.js";
export { githubForge } from "./github-forge.js";
export { bitbucketForge, gitlabForge } from "./gitlab-forge.js";
export {
  buildPortfolioCard,
  buildReportCard,
  decodeCardPayload,
  encodeCardPayload,
  type PortfolioCard,
  type ReportCard,
} from "./report-card.js";
export { createReportGist, fetchReportGist, type GistReport } from "./gist.js";
export {
  authSetupInstructions,
  oauthClientId,
  pollDeviceToken,
  startDeviceFlow,
  validateAuth,
  type AuthWizardResult,
  type DeviceCodeResponse,
} from "./auth.js";
export {
  exampleConfigYaml,
  parseConfigText,
  type OpenHearthConfig,
} from "./config.js";
export {
  fetchAuditJsonFromUrl,
  listAuditArtifacts,
  type ActionsArtifactHint,
} from "./actions-import.js";

export {
  LLMError,
  createLLMClient,
  resolveLLMConfig,
  type LLMCompleteOptions,
  type LLMConfig,
  type LLMMessage,
  type LLMProvider,
  type LLMProviderId,
} from "./llm.js";

export {
  buildAISafetyCard,
  buildEvidence,
  buildShareCaption,
  buildSummaryPrompt,
  generateAuditSummary,
  templateSummary,
  type AISafetyCard,
  type AuditSummary,
  type EvidenceCitation,
  type ShareCaption,
  type SummaryOptions,
  type SummaryTone,
} from "./ai-summary.js";

export const APP_NAME = "OpenHearth";
export const APP_TAGLINE =
  "A cozy open-source contribution audit — find every PR, issue, and review GitHub's activity feed hides.";
