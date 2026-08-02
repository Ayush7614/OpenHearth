export type RateLimitInfo = {
  remaining: number;
  limit: number;
  reset: number;
};

export type SearchIssueItem = {
  id: number;
  number: number;
  title: string;
  html_url: string;
  state: "open" | "closed";
  created_at: string;
  closed_at: string | null;
  pull_request?: {
    url: string;
    html_url: string;
    merged_at: string | null;
  };
  repository_url: string;
  user: { login: string } | null;
};

type SearchResponse = {
  total_count: number;
  incomplete_results: boolean;
  items: SearchIssueItem[];
};

/** GitHub activity sidebar typically lists ~25 repos before truncating. */
export const ACTIVITY_FEED_REPO_CAP = 25;

let authToken = "";

export function setAuthToken(token: string): void {
  authToken = token.trim();
}

export function getAuthToken(): string {
  if (authToken) return authToken;
  if (typeof process !== "undefined" && process.env) {
    return process.env.GITHUB_TOKEN || process.env.GH_TOKEN || "";
  }
  return "";
}

let lastRateLimit: RateLimitInfo = {
  remaining: -1,
  limit: -1,
  reset: 0,
};

export function getRateLimit(): RateLimitInfo {
  return { ...lastRateLimit };
}

function updateRateLimit(res: Response): void {
  const remaining = res.headers.get("X-RateLimit-Remaining");
  const limit = res.headers.get("X-RateLimit-Limit");
  const reset = res.headers.get("X-RateLimit-Reset");
  if (remaining != null) lastRateLimit.remaining = Number(remaining);
  if (limit != null) lastRateLimit.limit = Number(limit);
  if (reset != null) lastRateLimit.reset = Number(reset);
}

export class GitHubApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "GitHubApiError";
    this.status = status;
  }
}

function formatRateLimitHint(): string {
  const hasToken = Boolean(getAuthToken());
  const { remaining, limit, reset } = lastRateLimit;
  const lines: string[] = [];

  if (!hasToken) {
    lines.push(
      "Unauthenticated Search API is limited (~60 requests/hour).",
      "Set GITHUB_TOKEN or pass --token for ~5,000 requests/hour.",
      "Create a token: https://github.com/settings/tokens",
      "Then: export GITHUB_TOKEN=YOUR_TOKEN"
    );
  } else if (reset > 0) {
    const resetAt = new Date(reset * 1000).toISOString().replace(/\.\d{3}Z$/, "Z");
    const quota =
      remaining >= 0 && limit > 0 ? `${remaining}/${limit} remaining` : "quota exhausted";
    lines.push(`Authenticated rate limit: ${quota}. Resets at ${resetAt}.`);
    lines.push("Wait for the reset, or retry with openhearth doctor to check status.");
  } else {
    lines.push("Set GITHUB_TOKEN or pass --token, then retry.");
  }

  return lines.map((l) => `  ${l}`).join("\n");
}

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

function retryWaitMs(attempt: number): number {
  const reset = lastRateLimit.reset;
  if (reset > 0) {
    const untilReset = reset * 1000 - Date.now() + 500;
    // Cap wait so the UI/CLI don't hang forever (max ~20s per attempt).
    return Math.min(Math.max(untilReset, 800 * attempt), 20_000);
  }
  return Math.min(1000 * 2 ** attempt, 8_000);
}

async function githubFetch(
  url: string,
  attempt = 0,
  init: RequestInit = {}
): Promise<Response> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    ...(init.headers as Record<string, string> | undefined),
  };
  const token = getAuthToken();
  if (token && !headers.Authorization) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(url, { ...init, headers });
  updateRateLimit(res);

  if ((res.status === 403 || res.status === 429) && attempt < 2) {
    const wait = retryWaitMs(attempt + 1);
    await sleep(wait);
    return githubFetch(url, attempt + 1, init);
  }

  if (res.status === 403 || res.status === 429) {
    const body = await res.json().catch(() => ({}));
    const apiMsg =
      (body as { message?: string }).message ?? "GitHub rate limit exceeded.";
    const waited = attempt > 0 ? `\n  Retried ${attempt} time(s) after short backoff.` : "";
    throw new GitHubApiError(`${apiMsg}${waited}\n\n${formatRateLimitHint()}`, res.status);
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const msg =
      (body as { message?: string }).message ?? `GitHub API error (${res.status})`;
    throw new GitHubApiError(msg, res.status);
  }

  return res;
}

/** Authenticated JSON request helper (GET/POST/…). */
export async function githubJson<T>(
  url: string,
  init: RequestInit = {}
): Promise<T> {
  const headers: Record<string, string> = {
    ...(init.headers as Record<string, string> | undefined),
  };
  if (init.body && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }
  const res = await githubFetch(url, 0, { ...init, headers });
  return (await res.json()) as T;
}

/** Probe GitHub /rate_limit (does not consume search quota meaningfully). */
export async function checkRateLimit(): Promise<{
  authenticated: boolean;
  core: RateLimitInfo;
  search: RateLimitInfo;
}> {
  const res = await githubFetch("https://api.github.com/rate_limit");
  const data = (await res.json()) as {
    resources: {
      core: { remaining: number; limit: number; reset: number };
      search: { remaining: number; limit: number; reset: number };
    };
  };
  return {
    authenticated: Boolean(getAuthToken()),
    core: {
      remaining: data.resources.core.remaining,
      limit: data.resources.core.limit,
      reset: data.resources.core.reset,
    },
    search: {
      remaining: data.resources.search.remaining,
      limit: data.resources.search.limit,
      reset: data.resources.search.reset,
    },
  };
}

export async function searchIssuesPage(
  query: string,
  page: number
): Promise<SearchResponse> {
  const params = new URLSearchParams({
    q: query,
    per_page: "100",
    page: String(page),
    sort: "created",
    order: "desc",
  });
  const res = await githubFetch(
    `https://api.github.com/search/issues?${params.toString()}`
  );
  return (await res.json()) as SearchResponse;
}

export async function searchIssuesAll(
  query: string,
  onProgress?: (fetched: number, total: number) => void
): Promise<{ items: SearchIssueItem[]; total_count: number }> {
  const first = await searchIssuesPage(query, 1);
  const total = first.total_count;
  const items = [...first.items];
  onProgress?.(items.length, Math.min(total, 1000));

  if (total === 0) {
    return { items, total_count: 0 };
  }

  const pagesNeeded = Math.min(Math.ceil(Math.min(total, 1000) / 100), 10);
  for (let page = 2; page <= pagesNeeded; page++) {
    const next = await searchIssuesPage(query, page);
    items.push(...next.items);
    onProgress?.(items.length, Math.min(total, 1000));
  }

  return { items, total_count: total };
}

export function repoFullNameFromUrl(repositoryUrl: string): string {
  const parts = repositoryUrl.replace(/\/$/, "").split("/");
  const name = parts.pop() ?? "";
  const owner = parts.pop() ?? "";
  return `${owner}/${name}`;
}
