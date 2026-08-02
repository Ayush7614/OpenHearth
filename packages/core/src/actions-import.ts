import { githubJson, getAuthToken, GitHubApiError } from "./github.js";
import type { AuditInsights } from "./insights.js";

export type ActionsArtifactHint = {
  id: number;
  name: string;
  archiveDownloadUrl: string;
  createdAt: string;
};

/** List recent Actions artifacts for a repo (needs token with actions:read). */
export async function listAuditArtifacts(
  ownerRepo: string,
  limit = 10
): Promise<ActionsArtifactHint[]> {
  if (!getAuthToken()) {
    throw new GitHubApiError("Listing artifacts requires GITHUB_TOKEN.", 401);
  }
  const [owner, repo] = ownerRepo.split("/");
  if (!owner || !repo) throw new Error(`Invalid repo "${ownerRepo}". Use owner/repo.`);

  const data = await githubJson<{
    artifacts: Array<{
      id: number;
      name: string;
      archive_download_url: string;
      created_at: string;
      expired: boolean;
    }>;
  }>(`https://api.github.com/repos/${owner}/${repo}/actions/artifacts?per_page=${limit}`);

  return data.artifacts
    .filter((a) => !a.expired && /openhearth|audit/i.test(a.name))
    .map((a) => ({
      id: a.id,
      name: a.name,
      archiveDownloadUrl: a.archive_download_url,
      createdAt: a.created_at,
    }));
}

/** Fetch a raw JSON audit URL (gist raw, Pages, or pasted Actions export). */
export async function fetchAuditJsonFromUrl(url: string): Promise<{
  username?: string;
  insights: AuditInsights;
  range?: { from?: string; to?: string };
}> {
  const res = await fetch(url, {
    headers: getAuthToken() ? { Authorization: `Bearer ${getAuthToken()}` } : {},
  });
  if (!res.ok) throw new GitHubApiError(`Failed to fetch ${url} (${res.status})`, res.status);
  const data = (await res.json()) as {
    username?: string;
    insights?: AuditInsights;
    range?: { from?: string; to?: string };
  };
  if (!data.insights) throw new Error("URL JSON is missing insights (not an OpenHearth audit export).");
  return { username: data.username, insights: data.insights, range: data.range };
}
