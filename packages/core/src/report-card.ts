import type { AuditInsights } from "./insights.js";

/** Portable share card payload (URL / gist / portfolio). */
export type ReportCard = {
  v: 1;
  kind: "report";
  username: string;
  label: string;
  insights: AuditInsights;
  generatedAt: string;
};

export type PortfolioCard = {
  v: 1;
  kind: "portfolio";
  username: string;
  label: string;
  insights: AuditInsights;
  headline?: string;
  generatedAt: string;
};

export function buildReportCard(
  username: string,
  label: string,
  insights: AuditInsights
): ReportCard {
  return {
    v: 1,
    kind: "report",
    username,
    label,
    insights,
    generatedAt: new Date().toISOString(),
  };
}

export function buildPortfolioCard(
  username: string,
  label: string,
  insights: AuditInsights,
  headline?: string
): PortfolioCard {
  return {
    v: 1,
    kind: "portfolio",
    username,
    label,
    insights,
    headline:
      headline ??
      `@${username} · ${insights.totalContributions} contribs · ~${insights.reposHiddenByFeed} likely hidden from the activity feed`,
    generatedAt: new Date().toISOString(),
  };
}

/** Node + browser base64url JSON encode. */
export function encodeCardPayload(payload: ReportCard | PortfolioCard): string {
  const json = JSON.stringify(payload);
  if (typeof Buffer !== "undefined") {
    return Buffer.from(json, "utf8")
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
  }
  const bytes = new TextEncoder().encode(json);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function decodeCardPayload(encoded: string): ReportCard | PortfolioCard | null {
  try {
    let json: string;
    if (typeof Buffer !== "undefined") {
      const padded = encoded.replace(/-/g, "+").replace(/_/g, "/");
      const pad = padded.length % 4 === 0 ? "" : "=".repeat(4 - (padded.length % 4));
      json = Buffer.from(padded + pad, "base64").toString("utf8");
    } else {
      const padded = encoded.replace(/-/g, "+").replace(/_/g, "/");
      const pad = padded.length % 4 === 0 ? "" : "=".repeat(4 - (padded.length % 4));
      const bin = atob(padded + pad);
      const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
      json = new TextDecoder().decode(bytes);
    }
    const data = JSON.parse(json) as ReportCard | PortfolioCard;
    if (data?.v !== 1 || !data.insights || !data.username) return null;
    if (data.kind !== "report" && data.kind !== "portfolio") return null;
    return data;
  } catch {
    return null;
  }
}
