import {
  fullAuditToCsv,
  fullAuditToJson,
  getRateLimit,
  monthRange,
  runAudit,
  runFullAudit,
  setAuthToken,
  type AuditKind,
  type AuditResult,
  type FullAuditResult,
} from "@felix-ayush/openhearth-core";
import { downloadText, escapeAttr, escapeHtml } from "../lib/dom";
import { hrefFor } from "../lib/router";
import {
  deleteRun,
  getStoredToken,
  getWorkspace,
  listRuns,
  saveRunFromAudit,
  setStoredToken,
  type SavedRun,
} from "../lib/storage";
import {
  getStoredTheme,
  themeLabel,
  themeToggleHint,
  toggleTheme,
} from "./theme-helpers";

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function yearOptionsHtml(): string {
  const y = new Date().getFullYear();
  const years: number[] = [];
  for (let i = y; i >= y - 10; i--) years.push(i);
  return years.map((yr) => `<option value="${yr}">${yr}</option>`).join("");
}

function monthOptionsHtml(): string {
  const current = new Date().getMonth() + 1;
  return MONTHS.map(
    (name, i) =>
      `<option value="${i + 1}" ${i + 1 === current ? "selected" : ""}>${name}</option>`
  ).join("");
}

function themeToggleMarkup(): string {
  const theme = getStoredTheme();
  const icon = theme === "dark" ? "☀" : "☾";
  return `<button type="button" class="theme-toggle" id="theme-toggle" aria-label="${themeToggleHint(theme)}"><span class="theme-icon">${icon}</span><span class="theme-label">${themeLabel(theme)}</span></button>`;
}

function labelFor(kind: AuditKind): string {
  switch (kind) {
    case "pr":
      return "Pull Requests";
    case "issue":
      return "Issues";
    case "review":
      return "Reviews";
  }
}

function trackTable(runs: SavedRun[]): string {
  if (runs.length === 0) {
    return `<div class="empty"><strong>No saved runs</strong>Run an audit and click “Save to workspace” to track months here.</div>`;
  }

  const rows = [...runs]
    .sort((a, b) => a.month.localeCompare(b.month))
    .map((r) => {
      const i = r.insights;
      return `<tr>
        <td><strong>${escapeHtml(r.month)}</strong></td>
        <td>${i.totalContributions}</td>
        <td>${i.uniqueRepos}</td>
        <td>${i.reposHiddenByFeed}</td>
        <td>${i.mergeRate}%</td>
        <td>${i.byKind.pr}/${i.byKind.issue}/${i.byKind.review}</td>
        <td><button type="button" class="btn btn-ghost btn-sm" data-del-run="${escapeHtml(r.id)}">Remove</button></td>
      </tr>`;
    })
    .join("");

  return `
    <div class="track-wrap">
      <table class="track-table">
        <thead>
          <tr>
            <th>Month</th>
            <th>Total</th>
            <th>Repos</th>
            <th>Hidden</th>
            <th>Merge</th>
            <th>PR/Iss/Rev</th>
            <th></th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
}

export function renderWorkspaceView(root: HTMLElement, workspaceId: string): void {
  const found = getWorkspace(workspaceId);
  if (!found) {
    root.innerHTML = `
      <main class="shell app-main">
        <div class="empty"><strong>Workspace not found</strong>
          <a href="${hrefFor({ name: "workspaces" })}">Back to workspaces</a>
        </div>
      </main>`;
    return;
  }
  const workspace = found;

  let full: FullAuditResult | null = null;
  let activeTab: AuditKind = "pr";
  let loading = false;
  let lastMonth = "";

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

    <main class="shell app-main">
      <div class="app-heading">
        <div>
          <p class="eyebrow"><a href="${hrefFor({ name: "workspaces" })}">Workspaces</a> / ${escapeHtml(workspace.name)}</p>
          <h1>@${escapeHtml(workspace.username)}</h1>
          <p class="muted">Run the same audit as the CLI — then save months to track growth and hidden repos.</p>
        </div>
      </div>

      <form class="audit-form" id="audit-form" autocomplete="off">
        <div class="form-row">
          <div class="field">
            <label for="month">Month</label>
            <select id="month" name="month">${monthOptionsHtml()}</select>
          </div>
          <div class="field">
            <label for="year">Year</label>
            <select id="year" name="year">${yearOptionsHtml()}</select>
          </div>
          <div class="field field-action">
            <label>&nbsp;</label>
            <button type="submit" class="btn btn-primary" id="run-btn">Run full audit</button>
          </div>
        </div>
        <div class="token-row">
          <div class="field">
            <label for="token">Personal access token (optional)</label>
            <input id="token" name="token" type="password" placeholder="ghp_… or github_pat_…" autocomplete="off" />
          </div>
          <div class="field">
            <label>&nbsp;</label>
            <button type="button" class="btn btn-ghost" id="save-token">Save for session</button>
          </div>
        </div>
        <p class="hint">
          Token stays in sessionStorage and is sent only to api.github.com.
          Same engine as <code>npx @felix-ayush/openhearth</code>.
        </p>
      </form>

      <div class="status-bar" id="status" aria-live="polite"></div>

      <section class="results" id="results" hidden></section>

      <section class="track-section">
        <h2>Tracked months</h2>
        <p class="muted">Local history for this workspace — compare totals, repos, and hidden count over time.</p>
        <div id="track-panel">${trackTable(listRuns(workspace.id))}</div>
      </section>
    </main>
  `;

  const form = root.querySelector<HTMLFormElement>("#audit-form")!;
  const monthSelect = root.querySelector<HTMLSelectElement>("#month")!;
  const yearSelect = root.querySelector<HTMLSelectElement>("#year")!;
  const tokenInput = root.querySelector<HTMLInputElement>("#token")!;
  const runBtn = root.querySelector<HTMLButtonElement>("#run-btn")!;
  const statusEl = root.querySelector<HTMLElement>("#status")!;
  const resultsEl = root.querySelector<HTMLElement>("#results")!;
  const trackPanel = root.querySelector<HTMLElement>("#track-panel")!;

  tokenInput.value = getStoredToken();
  if (tokenInput.value) setAuthToken(tokenInput.value);

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

  function setStatus(html: string): void {
    statusEl.innerHTML = html;
    const rate = getRateLimit();
    if (rate.remaining >= 0) {
      const span = document.createElement("span");
      span.className = "rate";
      span.textContent = `API remaining: ${rate.remaining}/${rate.limit}`;
      statusEl.appendChild(span);
    }
  }

  function refreshTrack(): void {
    trackPanel.innerHTML = trackTable(listRuns(workspace.id));
    trackPanel.querySelectorAll<HTMLButtonElement>("[data-del-run]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.dataset.delRun;
        if (!id) return;
        deleteRun(id);
        refreshTrack();
      });
    });
  }

  refreshTrack();

  root.querySelector("#save-token")?.addEventListener("click", () => {
    setStoredToken(tokenInput.value);
    setAuthToken(tokenInput.value);
    setStatus(`<span>Token ${tokenInput.value.trim() ? "saved" : "cleared"} for this session.</span>`);
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (loading) return;

    const token = tokenInput.value.trim();
    setStoredToken(token);
    setAuthToken(token);

    const year = Number(yearSelect.value);
    const month = Number(monthSelect.value);
    const range = monthRange(year, month);
    lastMonth = `${year}-${String(month).padStart(2, "0")}`;

    loading = true;
    runBtn.disabled = true;
    resultsEl.hidden = false;
    setStatus(`<span class="progress">Running full audit for @${escapeHtml(workspace.username)}…</span>`);

    try {
      full = await runFullAudit(workspace.username, range, runAudit, (msg) => {
        setStatus(`<span class="progress">${escapeHtml(msg)}</span>`);
      });
      activeTab = "pr";
      setStatus(
        `<span>Done — ${full.insights.totalContributions} contributions across ${full.insights.uniqueRepos} repos.</span>`
      );
      renderResults();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setStatus(`<span class="error">${escapeHtml(message)}</span>`);
      full = null;
      renderResults();
    } finally {
      loading = false;
      runBtn.disabled = false;
    }
  });

  function renderResults(): void {
    if (!full) {
      resultsEl.innerHTML = loading
        ? `<div class="empty"><strong>Loading</strong>Fetching from GitHub Search API…</div>`
        : "";
      return;
    }

    const insights = full.insights;
    const tabResult = auditForTab(full, activeTab);

    resultsEl.innerHTML = `
      <div class="summary">
        <h2>@${escapeHtml(workspace.username)} · ${escapeHtml(lastMonth)}</h2>
        <p>
          ${insights.totalContributions} contributions ·
          ${insights.uniqueRepos} repos ·
          ${insights.mergeRate}% merge rate ·
          ~${insights.reposHiddenByFeed} likely hidden
        </p>
        <div class="summary-actions">
          <button type="button" class="btn btn-primary btn-sm" id="save-run">Save to workspace</button>
          <button type="button" class="btn btn-ghost btn-sm" id="export-json">Export JSON</button>
          <button type="button" class="btn btn-ghost btn-sm" id="export-csv">Export CSV</button>
        </div>
      </div>

      ${
        insights.reposHiddenByFeed > 0
          ? `<div class="insight-banner">
              <strong>Likely hidden by activity feed</strong>
              <p>${escapeHtml(insights.feedTruncationNote)}</p>
              <ul class="hidden-list">
                ${insights.likelyHiddenRepos
                  .slice(0, 12)
                  .map(
                    (r) =>
                      `<li><a href="https://github.com/${escapeAttr(r.repo)}" target="_blank" rel="noopener">${escapeHtml(r.repo)}</a> <span>${r.count}</span></li>`
                  )
                  .join("")}
                ${
                  insights.likelyHiddenRepos.length > 12
                    ? `<li class="muted">… and ${insights.likelyHiddenRepos.length - 12} more</li>`
                    : ""
                }
              </ul>
            </div>`
          : ""
      }

      <div class="tabs" role="tablist">
        ${tabButton("pr", "Pull Requests", full.pullRequests.total)}
        ${tabButton("issue", "Issues", full.issues.total)}
        ${tabButton("review", "Reviews", full.reviews.total)}
      </div>
      <div id="tab-panel">${renderRepoList(tabResult)}</div>
    `;

    resultsEl.querySelectorAll<HTMLButtonElement>(".tab").forEach((btn) => {
      btn.addEventListener("click", () => {
        activeTab = btn.dataset.kind as AuditKind;
        renderResults();
      });
    });

    resultsEl.querySelectorAll<HTMLButtonElement>(".repo-header").forEach((btn) => {
      btn.addEventListener("click", () => {
        btn.closest(".repo")?.classList.toggle("open");
      });
    });

    resultsEl.querySelector("#save-run")?.addEventListener("click", () => {
      if (!full || !lastMonth) return;
      saveRunFromAudit(workspace.id, lastMonth, full);
      setStatus(`<span>Saved ${escapeHtml(lastMonth)} to this workspace.</span>`);
      refreshTrack();
    });

    resultsEl.querySelector("#export-json")?.addEventListener("click", () => {
      if (!full) return;
      downloadText(
        `openhearth-${workspace.username}-${lastMonth}.json`,
        fullAuditToJson(full),
        "application/json"
      );
    });

    resultsEl.querySelector("#export-csv")?.addEventListener("click", () => {
      if (!full) return;
      downloadText(
        `openhearth-${workspace.username}-${lastMonth}.csv`,
        fullAuditToCsv(full),
        "text/csv"
      );
    });
  }

  function tabButton(kind: AuditKind, label: string, count: number): string {
    return `<button type="button" class="tab ${activeTab === kind ? "active" : ""}" data-kind="${kind}" role="tab">${label}<span class="count">${count.toLocaleString()}</span></button>`;
  }

  function auditForTab(result: FullAuditResult, kind: AuditKind): AuditResult {
    if (kind === "pr") return result.pullRequests;
    if (kind === "issue") return result.issues;
    return result.reviews;
  }

  function renderRepoList(result: AuditResult): string {
    if (result.total === 0) {
      return `<div class="empty"><strong>Nothing found</strong>No ${labelFor(result.kind).toLowerCase()} in this range.</div>`;
    }

    const showMerged = result.kind === "pr" || result.kind === "review";
    const repos = result.repos
      .map((repo) => {
        const pills = [
          showMerged && repo.merged ? `<span class="pill merged">${repo.merged} merged</span>` : "",
          repo.open ? `<span class="pill open">${repo.open} open</span>` : "",
          repo.closed ? `<span class="pill closed">${repo.closed} closed</span>` : "",
          `<span class="pill">${repo.items.length} total</span>`,
        ]
          .filter(Boolean)
          .join("");

        const items = repo.items
          .map(
            (item) => `
            <div class="item">
              <span class="item-state ${item.state}">${item.state}</span>
              <a class="item-title" href="${escapeAttr(item.url)}" target="_blank" rel="noopener">#${item.number} ${escapeHtml(item.title)}</a>
              <span class="item-meta">${item.createdAt.slice(0, 10)}</span>
            </div>`
          )
          .join("");

        return `
          <div class="repo">
            <button type="button" class="repo-header">
              <span class="chevron">▸</span>
              <span class="repo-name"><a href="https://github.com/${escapeAttr(repo.repo)}" target="_blank" rel="noopener" onclick="event.stopPropagation()">${escapeHtml(repo.repo)}</a></span>
              <span class="repo-stats">${pills}</span>
            </button>
            <div class="repo-items">${items}</div>
          </div>`;
      })
      .join("");

    return `<p class="tab-headline"><strong>${result.total.toLocaleString()}</strong> across <strong>${result.repos.length}</strong> repositories</p><div class="repo-list">${repos}</div>`;
  }
}
