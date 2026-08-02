import type { AuditInsights } from "./insights.js";

/** Short markdown digest for Slack / Discord / email webhooks. */
export function formatDigestMarkdown(opts: {
  username: string;
  label: string;
  insights: AuditInsights;
  appUrl?: string;
}): string {
  const { username, label, insights, appUrl } = opts;
  const hiddenSample = insights.likelyHiddenRepos
    .slice(0, 5)
    .map((r) => `• \`${r.repo}\` (${r.count})`)
    .join("\n");

  const lines = [
    `*OpenHearth digest · @${username} · ${label}*`,
    ``,
    `• Total: *${insights.totalContributions}*`,
    `• Repos: *${insights.uniqueRepos}* (feed ~${insights.reposVisibleOnFeed}, likely hidden ~${insights.reposHiddenByFeed})`,
    `• Merge rate: *${insights.mergeRate}%*`,
    `• PRs ${insights.byKind.pr} · Issues ${insights.byKind.issue} · Reviews ${insights.byKind.review}`,
  ];
  if (hiddenSample) {
    lines.push(``, `Likely hidden (sample):`, hiddenSample);
  }
  if (appUrl) {
    lines.push(``, `<${appUrl}|Open workspaces>`);
  }
  return lines.join("\n");
}

export function formatDigestPlain(opts: {
  username: string;
  label: string;
  insights: AuditInsights;
}): string {
  const { username, label, insights } = opts;
  return [
    `OpenHearth digest · @${username} · ${label}`,
    `Total ${insights.totalContributions} · Repos ${insights.uniqueRepos} · Hidden ~${insights.reposHiddenByFeed} · Merge ${insights.mergeRate}%`,
    `PRs ${insights.byKind.pr} · Issues ${insights.byKind.issue} · Reviews ${insights.byKind.review}`,
  ].join("\n");
}
