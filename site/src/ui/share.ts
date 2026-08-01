import { escapeHtml } from "../lib/dom";
import { decodeSharePayload } from "../lib/report";
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

export function renderShareView(root: HTMLElement, encoded: string): void {
  const payload = decodeSharePayload(encoded);

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

  if (!payload) {
    main.innerHTML = `<div class="empty"><strong>Invalid share link</strong>This report link is malformed or expired. <a href="${hrefFor({ name: "workspaces" })}">Open workspaces</a></div>`;
  } else {
    const i = payload.insights;
    main.innerHTML = `
      <div class="app-heading">
        <p class="eyebrow">Shared report</p>
        <h1>@${escapeHtml(payload.username)}</h1>
        <p class="muted">${escapeHtml(payload.month)} · read-only snapshot</p>
      </div>
      <div class="board-stats share-stats">
        <div><span class="muted">Total</span><strong>${i.totalContributions}</strong></div>
        <div><span class="muted">Repos</span><strong>${i.uniqueRepos}</strong></div>
        <div><span class="muted">Hidden</span><strong>${i.reposHiddenByFeed}</strong></div>
        <div><span class="muted">Merge</span><strong>${i.mergeRate}%</strong></div>
      </div>
      <p>${escapeHtml(i.feedTruncationNote)}</p>
      <p class="muted">PRs ${i.byKind.pr} · Issues ${i.byKind.issue} · Reviews ${i.byKind.review}</p>
      <h2 class="section-title">Top repositories</h2>
      <ul class="hidden-list">
        ${i.topRepos
          .slice(0, 10)
          .map((r) => `<li><span>${escapeHtml(r.repo)}</span><span>${r.count}</span></li>`)
          .join("")}
      </ul>
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
      <p class="hint" style="margin-top:2rem">Create your own workspace to run live audits.</p>
      <a class="btn btn-primary" href="${hrefFor({ name: "workspaces" })}">Open workspaces</a>
    `;
  }

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
