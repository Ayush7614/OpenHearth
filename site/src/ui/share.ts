import { escapeHtml } from "../lib/dom";
import { decodeAnyReport } from "../lib/report";
import { hrefFor } from "../lib/router";
import {
  getStoredTheme,
  themeLabel,
  themeToggleHint,
  toggleTheme,
} from "./theme-helpers";

function themeToggleMarkup(): string {
  const theme = getStoredTheme();
  const icon = theme === "dark" ? "☀" : "☾";
  return `<button type="button" class="theme-toggle" id="theme-toggle" aria-label="${themeToggleHint(theme)}"><span class="theme-icon">${icon}</span><span class="theme-label">${themeLabel(theme)}</span></button>`;
}

function bindTheme(root: HTMLElement): void {
  root.querySelector<HTMLButtonElement>("#theme-toggle")?.addEventListener("click", () => {
    const next = toggleTheme();
    const btn = root.querySelector<HTMLButtonElement>("#theme-toggle");
    if (!btn) return;
    btn.setAttribute("aria-label", themeToggleHint(next));
    const icon = btn.querySelector(".theme-icon");
    const label = btn.querySelector(".theme-label");
    if (icon) icon.textContent = next === "dark" ? "☀" : "☾";
    if (label) label.textContent = themeLabel(next);
  });
}

function reportBody(
  mode: "share" | "portfolio",
  username: string,
  label: string,
  insights: {
    totalContributions: number;
    uniqueRepos: number;
    reposHiddenByFeed: number;
    mergeRate: number;
    feedTruncationNote: string;
    byKind: { pr: number; issue: number; review: number };
    topRepos: Array<{ repo: string; count: number }>;
    likelyHiddenRepos: Array<{ repo: string; count: number }>;
  },
  headline?: string
): string {
  const i = insights;
  return `
    <div class="report-card-hero">
      <p class="eyebrow">${mode === "portfolio" ? "Hiring / portfolio card" : "Public report card"}</p>
      <h1>@${escapeHtml(username)}</h1>
      <p class="muted">${escapeHtml(label)} · read-only snapshot</p>
      ${headline ? `<p class="lead">${escapeHtml(headline)}</p>` : ""}
    </div>
    <div class="board-stats share-stats">
      <div><span class="muted">Total</span><strong>${i.totalContributions}</strong></div>
      <div><span class="muted">Repos</span><strong>${i.uniqueRepos}</strong></div>
      <div><span class="muted">Hidden</span><strong>${i.reposHiddenByFeed}</strong></div>
      <div><span class="muted">Merge</span><strong>${i.mergeRate}%</strong></div>
    </div>
    <p>${escapeHtml(i.feedTruncationNote)}</p>
    <p class="muted">PRs ${i.byKind.pr} · Issues ${i.byKind.issue} · Reviews ${i.byKind.review}</p>
    <div class="proof-grid">
      <section>
        <h2 class="section-title">Feed would show</h2>
        <ul class="hidden-list">
          ${i.topRepos
            .slice(0, 10)
            .map((r) => `<li><span>${escapeHtml(r.repo)}</span><span>${r.count}</span></li>`)
            .join("") || `<li class="muted">None</li>`}
        </ul>
      </section>
      <section>
        <h2 class="section-title">Likely hidden</h2>
        <ul class="hidden-list">
          ${
            i.likelyHiddenRepos.length
              ? i.likelyHiddenRepos
                  .slice(0, 15)
                  .map((r) => `<li><span>${escapeHtml(r.repo)}</span><span>${r.count}</span></li>`)
                  .join("")
              : `<li class="muted">None past the sidebar cap</li>`
          }
        </ul>
      </section>
    </div>
    <p class="hint" style="margin-top:2rem">Create your own workspace to run live audits.</p>
    <a class="btn btn-primary" href="${hrefFor({ name: "workspaces" })}">Open workspaces</a>
  `;
}

export function renderShareView(root: HTMLElement, encoded: string): void {
  const payload = decodeAnyReport(encoded);

  root.innerHTML = `
    <header class="app-top">
      <div class="shell app-top-inner">
        <a class="brand-mini" href="${hrefFor({ name: "docs" })}">Open<span>Hearth</span></a>
        <nav class="app-nav">
          <a href="${hrefFor({ name: "workspaces" })}" class="nav-link">Workspaces</a>
          <a href="${hrefFor({ name: "docs" })}" class="nav-link">Docs</a>
          ${themeToggleMarkup()}
        </nav>
      </div>
    </header>
    <main class="shell app-main" id="share-main"></main>
  `;

  const main = root.querySelector("#share-main")!;
  if (!payload || payload.mode === "portfolio") {
    // portfolio links should use /portfolio; still render if kind mismatch
    if (!payload) {
      main.innerHTML = `<div class="empty"><strong>Invalid share link</strong>This report link is malformed. <a href="${hrefFor({ name: "workspaces" })}">Open workspaces</a></div>`;
    } else {
      main.innerHTML = reportBody(
        "portfolio",
        payload.username,
        payload.label,
        payload.insights,
        payload.headline
      );
    }
  } else {
    main.innerHTML = reportBody("share", payload.username, payload.label, payload.insights);
  }
  bindTheme(root);
}

export function renderPortfolioView(root: HTMLElement, encoded: string): void {
  const payload = decodeAnyReport(encoded);

  root.innerHTML = `
    <header class="app-top">
      <div class="shell app-top-inner">
        <a class="brand-mini" href="${hrefFor({ name: "docs" })}">Open<span>Hearth</span></a>
        <nav class="app-nav">
          <a href="${hrefFor({ name: "workspaces" })}" class="nav-link">Workspaces</a>
          <a href="${hrefFor({ name: "board" })}" class="nav-link">Board</a>
          <a href="${hrefFor({ name: "docs" })}" class="nav-link">Docs</a>
          ${themeToggleMarkup()}
        </nav>
      </div>
    </header>
    <main class="shell app-main" id="portfolio-main"></main>
  `;

  const main = root.querySelector("#portfolio-main")!;
  if (!payload) {
    main.innerHTML = `<div class="empty"><strong>Invalid portfolio link</strong><a href="${hrefFor({ name: "workspaces" })}">Open workspaces</a></div>`;
  } else {
    main.innerHTML = reportBody(
      "portfolio",
      payload.username,
      payload.label,
      payload.insights,
      payload.mode === "portfolio" ? payload.headline : undefined
    );
  }
  bindTheme(root);
}

export function renderGistView(root: HTMLElement, gistId: string): void {
  root.innerHTML = `
    <header class="app-top">
      <div class="shell app-top-inner">
        <a class="brand-mini" href="${hrefFor({ name: "docs" })}">Open<span>Hearth</span></a>
        <nav class="app-nav">
          <a href="${hrefFor({ name: "workspaces" })}" class="nav-link">Workspaces</a>
          <a href="${hrefFor({ name: "docs" })}" class="nav-link">Docs</a>
          ${themeToggleMarkup()}
        </nav>
      </div>
    </header>
    <main class="shell app-main" id="gist-main">
      <div class="empty"><strong>Loading report…</strong>Fetching gist <code>${escapeHtml(gistId)}</code></div>
    </main>
  `;
  bindTheme(root);

  const main = root.querySelector("#gist-main")!;
  void (async () => {
    try {
      const { fetchReportGist } = await import("@felix-ayush/openhearth-core");
      const card = await fetchReportGist(gistId);
      const mode = card.kind === "portfolio" ? "portfolio" : "share";
      main.innerHTML = reportBody(
        mode,
        card.username,
        card.label,
        card.insights,
        card.kind === "portfolio" ? card.headline : undefined
      );
    } catch (err) {
      main.innerHTML = `<div class="empty"><strong>Could not load gist</strong>${escapeHtml(
        err instanceof Error ? err.message : String(err)
      )} <a href="${hrefFor({ name: "workspaces" })}">Open workspaces</a></div>`;
    }
  })();
}
