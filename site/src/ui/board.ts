import { escapeHtml } from "../lib/dom";
import { hrefFor } from "../lib/router";
import { listRuns, listWorkspaces } from "../lib/storage";
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

function deltaClass(n: number): string {
  if (n > 0) return "delta up";
  if (n < 0) return "delta down";
  return "delta flat";
}

function fmtDelta(n: number): string {
  if (n > 0) return `+${n}`;
  return String(n);
}

export function renderBoard(root: HTMLElement): void {
  const workspaces = listWorkspaces();

  const cards = workspaces
    .map((ws) => {
      const runs = listRuns(ws.id);
      const latest = [...runs].sort((a, b) => b.month.localeCompare(a.month))[0];
      const prev = [...runs].sort((a, b) => b.month.localeCompare(a.month))[1];
      const dTotal = latest && prev ? latest.insights.totalContributions - prev.insights.totalContributions : null;
      const dHidden = latest && prev ? latest.insights.reposHiddenByFeed - prev.insights.reposHiddenByFeed : null;

      return `
        <article class="board-card">
          <a href="${hrefFor({ name: "workspace", id: ws.id })}" class="board-card-link">
            <h3>${escapeHtml(ws.name)}</h3>
            <p class="ws-meta">@${escapeHtml(ws.username)}</p>
            ${
              latest
                ? `<div class="board-stats">
                    <div><span class="muted">Latest</span><strong>${escapeHtml(latest.month)}</strong></div>
                    <div><span class="muted">Total</span><strong>${latest.insights.totalContributions}</strong>
                      ${dTotal !== null ? `<em class="${deltaClass(dTotal)}">${fmtDelta(dTotal)}</em>` : ""}
                    </div>
                    <div><span class="muted">Repos</span><strong>${latest.insights.uniqueRepos}</strong></div>
                    <div><span class="muted">Hidden</span><strong>${latest.insights.reposHiddenByFeed}</strong>
                      ${dHidden !== null ? `<em class="${deltaClass(dHidden)}">${fmtDelta(dHidden)}</em>` : ""}
                    </div>
                    <div><span class="muted">Merge</span><strong>${latest.insights.mergeRate}%</strong></div>
                  </div>`
                : `<p class="muted">No saved runs yet — open and audit a month.</p>`
            }
          </a>
        </article>`;
    })
    .join("");

  root.innerHTML = `
    <header class="app-top">
      <div class="shell app-top-inner">
        <a class="brand-mini" href="${hrefFor({ name: "docs" })}">Open<span>Hearth</span></a>
        <nav class="app-nav">
          <a href="${hrefFor({ name: "workspaces" })}" class="nav-link">Workspaces</a>
          <a href="${hrefFor({ name: "board" })}" class="nav-link active">Board</a>
          <a href="${hrefFor({ name: "docs" })}" class="nav-link">Docs</a>
          ${themeToggleMarkup()}
        </nav>
      </div>
    </header>

    <main class="shell app-main">
      <div class="app-heading">
        <div>
          <h1>Multi-user board</h1>
          <p class="muted">Compare every workspace side by side — latest month and change vs previous save.</p>
        </div>
      </div>
      <section class="board-grid">
        ${
          workspaces.length === 0
            ? `<div class="empty"><strong>No workspaces</strong>Create workspaces first, save a few months, then return here.</div>`
            : cards
        }
      </section>
    </main>
  `;

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
