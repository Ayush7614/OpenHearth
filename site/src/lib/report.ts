import type { AuditInsights } from "@felix-ayush/openhearth-core";
import {
  decodeCardPayload,
  type PortfolioCard,
  type ReportCard,
} from "@felix-ayush/openhearth-core";

export type SharePayload = {
  v: 1;
  username: string;
  month: string;
  insights: AuditInsights;
  generatedAt: string;
};

export type DecodedReport =
  | { mode: "share"; username: string; label: string; insights: AuditInsights; generatedAt: string }
  | {
      mode: "portfolio";
      username: string;
      label: string;
      insights: AuditInsights;
      generatedAt: string;
      headline?: string;
    };

function toBase64Url(json: string): string {
  const bytes = new TextEncoder().encode(json);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(raw: string): string {
  const padded = raw.replace(/-/g, "+").replace(/_/g, "/");
  const pad = padded.length % 4 === 0 ? "" : "=".repeat(4 - (padded.length % 4));
  const bin = atob(padded + pad);
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export function encodeSharePayload(payload: SharePayload): string {
  return toBase64Url(JSON.stringify(payload));
}

export function decodeSharePayload(encoded: string): SharePayload | null {
  try {
    const data = JSON.parse(fromBase64Url(encoded)) as SharePayload & { kind?: string; label?: string };
    if (data?.v !== 1 || !data.insights || !data.username) return null;
    if (data.kind === "portfolio") return null;
    if (!data.month && data.label) {
      return {
        v: 1,
        username: data.username,
        month: data.label,
        insights: data.insights,
        generatedAt: data.generatedAt,
      };
    }
    if (!data.month) return null;
    return data as SharePayload;
  } catch {
    return null;
  }
}

export function decodeAnyReport(encoded: string): DecodedReport | null {
  const card = decodeCardPayload(encoded) as ReportCard | PortfolioCard | null;
  if (card) {
    return {
      mode: card.kind === "portfolio" ? "portfolio" : "share",
      username: card.username,
      label: card.label,
      insights: card.insights,
      generatedAt: card.generatedAt,
      headline: card.kind === "portfolio" ? card.headline : undefined,
    };
  }
  const legacy = decodeSharePayload(encoded);
  if (!legacy) return null;
  return {
    mode: "share",
    username: legacy.username,
    label: legacy.month,
    insights: legacy.insights,
    generatedAt: legacy.generatedAt,
  };
}

export function shareHashFor(payload: SharePayload): string {
  return `#/share/${encodeSharePayload(payload)}`;
}

export function absoluteShareUrl(payload: SharePayload): string {
  const base = `${location.origin}${location.pathname}`.replace(/\/$/, "") || location.href.split("#")[0];
  return `${base}${shareHashFor(payload)}`;
}

export function buildStandaloneReportHtml(payload: SharePayload): string {
  const i = payload.insights;
  const top = i.topRepos
    .slice(0, 8)
    .map((r) => `<li><code>${escape(r.repo)}</code> — ${r.count}</li>`)
    .join("");
  const hidden = i.likelyHiddenRepos
    .slice(0, 15)
    .map((r) => `<li><code>${escape(r.repo)}</code> — ${r.count}</li>`)
    .join("");
  const feed = i.topRepos
    .slice(0, 8)
    .map((r) => `<li><code>${escape(r.repo)}</code> — ${r.count}</li>`)
    .join("");

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>OpenHearth report · @${escape(payload.username)} · ${escape(payload.month)}</title>
  <style>
    :root { color-scheme: dark; --bg:#161311; --ink:#f2ebe3; --muted:#a89f94; --accent:#e8a65d; --line:rgba(242,235,227,.12); }
    body { margin:0; font:16px/1.5 system-ui,sans-serif; background:var(--bg); color:var(--ink); }
    main { max-width:720px; margin:0 auto; padding:2.5rem 1.25rem 4rem; }
    h1 { font-size:2rem; font-weight:600; margin:0 0 .35rem; }
    h2 { font-size:1.15rem; margin:2rem 0 .75rem; }
    .muted { color:var(--muted); }
    .grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(140px,1fr)); gap:.75rem; margin:1.25rem 0; }
    .stat { border:1px solid var(--line); border-radius:12px; padding:1rem; }
    .stat strong { display:block; font-size:1.5rem; color:var(--accent); }
    .cols { display:grid; grid-template-columns:1fr 1fr; gap:1rem; }
    @media (max-width:640px){ .cols{grid-template-columns:1fr;} }
    ul { padding-left:1.1rem; }
    code { font-family:ui-monospace,monospace; font-size:.9em; }
    footer { margin-top:3rem; color:var(--muted); font-size:.85rem; }
    a { color:var(--accent); }
  </style>
</head>
<body>
  <main>
    <p class="muted">OpenHearth · public report card</p>
    <h1>@${escape(payload.username)}</h1>
    <p class="muted">${escape(payload.month)} · generated ${escape(payload.generatedAt.slice(0, 19))}Z</p>
    <div class="grid">
      <div class="stat"><span class="muted">Total</span><strong>${i.totalContributions}</strong></div>
      <div class="stat"><span class="muted">Repos</span><strong>${i.uniqueRepos}</strong></div>
      <div class="stat"><span class="muted">Hidden</span><strong>${i.reposHiddenByFeed}</strong></div>
      <div class="stat"><span class="muted">Merge</span><strong>${i.mergeRate}%</strong></div>
    </div>
    <p>${escape(i.feedTruncationNote)}</p>
    <div class="cols">
      <div>
        <h2>Feed would show</h2>
        <ul>${feed || "<li class='muted'>None</li>"}</ul>
      </div>
      <div>
        <h2>Likely hidden</h2>
        <ul>${hidden || "<li class='muted'>None past the sidebar cap</li>"}</ul>
      </div>
    </div>
    <h2>Top repositories</h2>
    <ul>${top || "<li class='muted'>None</li>"}</ul>
    <footer>Built with <a href="https://ayush7614.github.io/OpenHearth/">OpenHearth</a> · <code>npx @felix-ayush/openhearth</code></footer>
  </main>
</body>
</html>`;
}

function escape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
