import { computeRepoOverlap } from "@felix-ayush/openhearth-core";
import { escapeHtml } from "../lib/dom";
import { hrefFor } from "../lib/router";
import { showToast } from "../lib/toast";
import { createWorkspace, listRuns, listWorkspaces, type Workspace } from "../lib/storage";
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

function latestRun(wsId: string) {
  const runs = listRuns(wsId);
  return [...runs].sort((a, b) => b.month.localeCompare(a.month))[0];
}

function overlapBlock(a: Workspace, b: Workspace): string {
  const ra = latestRun(a.id);
  const rb = latestRun(b.id);
  if (!ra || !rb) return "";
  const overlap = computeRepoOverlap(a.username, ra.insights, b.username, rb.insights);
  const shared = overlap.sharedRepos
    .slice(0, 12)
    .map((r) => `<li><span>${escapeHtml(r.repo)}</span><span>${r.count}</span></li>`)
    .join("");
  return `
    <div class="overlap-block">
      <h3>Shared repositories</h3>
      <p class="muted">From latest insight snapshots (top + likely-hidden lists).</p>
      <ul class="hidden-list">${shared || `<li class="muted">No overlap in saved insight lists</li>`}</ul>
      <p class="muted">Only @${escapeHtml(a.username)}: ${overlap.onlyA.length} · Only @${escapeHtml(b.username)}: ${overlap.onlyB.length}</p>
    </div>`;
}

function compareTable(a: Workspace, b: Workspace): string {
  const ra = latestRun(a.id);
  const rb = latestRun(b.id);
  if (!ra || !rb) {
    return `<div class="empty"><strong>Need saved runs</strong>Both users need at least one saved month.</div>`;
  }

  const rows: Array<[string, number, number]> = [
    ["Total contributions", ra.insights.totalContributions, rb.insights.totalContributions],
    ["Unique repos", ra.insights.uniqueRepos, rb.insights.uniqueRepos],
    ["Likely hidden", ra.insights.reposHiddenByFeed, rb.insights.reposHiddenByFeed],
    ["Merge rate %", ra.insights.mergeRate, rb.insights.mergeRate],
    ["PRs", ra.insights.byKind.pr, rb.insights.byKind.pr],
    ["Issues", ra.insights.byKind.issue, rb.insights.byKind.issue],
    ["Reviews", ra.insights.byKind.review, rb.insights.byKind.review],
  ];

  return `
    <div class="compare-users">
      <p class="muted">Comparing latest saves: <strong>@${escapeHtml(a.username)}</strong> ${escapeHtml(ra.month)} vs <strong>@${escapeHtml(b.username)}</strong> ${escapeHtml(rb.month)}</p>
      <div class="track-wrap">
        <table class="track-table">
          <thead>
            <tr>
              <th>Metric</th>
              <th>@${escapeHtml(a.username)}</th>
              <th>@${escapeHtml(b.username)}</th>
              <th>Δ</th>
            </tr>
          </thead>
          <tbody>
            ${rows
              .map(([label, va, vb]) => {
                const d = va - vb;
                return `<tr>
                  <td>${escapeHtml(label)}</td>
                  <td>${va}</td>
                  <td>${vb}</td>
                  <td><em class="${deltaClass(d)}">${fmtDelta(d)}</em></td>
                </tr>`;
              })
              .join("")}
          </tbody>
        </table>
      </div>
      ${overlapBlock(a, b)}
    </div>`;
}

export function renderBoard(root: HTMLElement): void {
  const workspaces = listWorkspaces();
  const options = workspaces
    .map((w) => `<option value="${escapeHtml(w.id)}">@${escapeHtml(w.username)} — ${escapeHtml(w.name)}</option>`)
    .join("");

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
          <p class="muted">Team radar, compare two users, and spot shared repositories.</p>
        </div>
      </div>

      <section class="compare-picker audit-form">
        <h2>Team / org radar</h2>
        <p class="muted">Paste GitHub usernames (newline or comma). Creates workspaces so you can audit each on the board.</p>
        <textarea id="radar-users" rows="3" placeholder="octocat&#10;torvalds&#10;Ayush7614"></textarea>
        <div class="form-row" style="margin-top:.75rem">
          <button type="button" class="btn btn-ghost" id="radar-add">Add workspaces</button>
        </div>
      </section>

      <section class="compare-picker audit-form">
        <h2>Compare two users</h2>
        <div class="form-row ws-create-row">
          <div class="field">
            <label for="cmp-a">User A</label>
            <select id="cmp-a">${options}</select>
          </div>
          <div class="field">
            <label for="cmp-b">User B</label>
            <select id="cmp-b">${options}</select>
          </div>
          <div class="field field-action">
            <label>&nbsp;</label>
            <button type="button" class="btn btn-primary" id="cmp-run" ${workspaces.length < 2 ? "disabled" : ""}>Compare</button>
          </div>
        </div>
        <div id="cmp-out"></div>
      </section>

      <section class="board-grid">
        ${
          workspaces.length === 0
            ? `<div class="empty"><strong>No workspaces</strong>Create workspaces first (or load demo data from Workspaces), then return here.</div>`
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

  root.querySelector("#radar-add")?.addEventListener("click", () => {
    const raw = root.querySelector<HTMLTextAreaElement>("#radar-users")?.value ?? "";
    const users = raw
      .split(/[\s,]+/)
      .map((u) => u.replace(/^@/, "").trim())
      .filter(Boolean);
    if (users.length === 0) {
      showToast("Paste at least one username", "err");
      return;
    }
    let created = 0;
    for (const user of users) {
      const exists = listWorkspaces().some((w) => w.username.toLowerCase() === user.toLowerCase());
      if (exists) continue;
      createWorkspace(`Radar · ${user}`, user);
      created++;
    }
    showToast(created ? `Added ${created} workspace(s)` : "All users already have workspaces", created ? "ok" : "info");
    renderBoard(root);
  });

  const selA = root.querySelector<HTMLSelectElement>("#cmp-a");
  const selB = root.querySelector<HTMLSelectElement>("#cmp-b");
  if (selA && selB && workspaces.length >= 2) {
    selB.selectedIndex = Math.min(1, workspaces.length - 1);
  }

  root.querySelector("#cmp-run")?.addEventListener("click", () => {
    const a = workspaces.find((w) => w.id === selA?.value);
    const b = workspaces.find((w) => w.id === selB?.value);
    const out = root.querySelector("#cmp-out");
    if (!a || !b || !out) return;
    if (a.id === b.id) {
      showToast("Pick two different users", "err");
      return;
    }
    out.innerHTML = compareTable(a, b);
    showToast(`Compared @${a.username} vs @${b.username}`, "ok");
  });
}
