import { githubJson, getAuthToken, GitHubApiError } from "./github.js";
import type { PortfolioCard, ReportCard } from "./report-card.js";

const REPORT_FILENAME = "openhearth-report.json";

export type GistReport = ReportCard | PortfolioCard;

/** Publish a report card as a public gist → short `#/r/:id` URL. */
export async function createReportGist(
  card: GistReport,
  opts?: { description?: string; public?: boolean }
): Promise<{ id: string; htmlUrl: string; rawUrl: string }> {
  if (!getAuthToken()) {
    throw new GitHubApiError(
      "Creating a gist requires auth. Run `openhearth auth` or export GITHUB_TOKEN (scope: gist).",
      401
    );
  }

  const body = {
    description: opts?.description ?? `OpenHearth report · @${card.username} · ${card.label}`,
    public: opts?.public ?? true,
    files: {
      [REPORT_FILENAME]: {
        content: JSON.stringify(card, null, 2),
      },
    },
  };

  const gist = await githubJson<{
    id: string;
    html_url: string;
    files: Record<string, { raw_url: string }>;
  }>("https://api.github.com/gists", {
    method: "POST",
    body: JSON.stringify(body),
  });

  const rawUrl = gist.files[REPORT_FILENAME]?.raw_url ?? "";
  return { id: gist.id, htmlUrl: gist.html_url, rawUrl };
}

/** Load a report card previously published with createReportGist. */
export async function fetchReportGist(gistId: string): Promise<GistReport> {
  const gist = await githubJson<{
    files: Record<string, { content?: string; raw_url?: string; filename?: string }>;
  }>(`https://api.github.com/gists/${encodeURIComponent(gistId)}`);

  const file =
    gist.files[REPORT_FILENAME] ??
    Object.values(gist.files).find((f) => f.filename?.endsWith(".json")) ??
    Object.values(gist.files)[0];

  if (!file) throw new GitHubApiError("Gist has no files.", 404);

  let content = file.content ?? "";
  if (!content && file.raw_url) {
    const res = await fetch(file.raw_url);
    if (!res.ok) throw new GitHubApiError(`Failed to fetch gist raw content (${res.status})`, res.status);
    content = await res.text();
  }

  const data = JSON.parse(content) as GistReport;
  if (!data?.insights || !data.username) {
    throw new GitHubApiError("Gist is not a valid OpenHearth report card.", 400);
  }
  return data;
}
