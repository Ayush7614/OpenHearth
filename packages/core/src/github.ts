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
  return authToken || process.env.GITHUB_TOKEN || process.env.GH_TOKEN || "";
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

async function githubFetch(url: string): Promise<Response> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  const token = getAuthToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(url, { headers });
  updateRateLimit(res);

  if (res.status === 403 || res.status === 429) {
    const body = await res.json().catch(() => ({}));
    const msg =
      (body as { message?: string }).message ??
      "GitHub rate limit exceeded. Set GITHUB_TOKEN and try again.";
    throw new GitHubApiError(msg, res.status);
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const msg =
      (body as { message?: string }).message ?? `GitHub API error (${res.status})`;
    throw new GitHubApiError(msg, res.status);
  }

  return res;
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
