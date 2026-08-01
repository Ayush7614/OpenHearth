import {
  getStoredTheme,
  themeLabel,
  themeToggleHint,
  toggleTheme,
} from "./theme-helpers";
import { escapeHtml } from "../lib/dom";
import { hrefFor, navigate } from "../lib/router";
import {
  createWorkspace,
  deleteWorkspace,
  listRuns,
  listWorkspaces,
  type Workspace,
} from "../lib/storage";

function themeToggleMarkup(): string {
  const theme = getStoredTheme();
  const icon = theme === "dark" ? "☀" : "☾";
  return `<button type="button" class="theme-toggle" id="theme-toggle" aria-label="${themeToggleHint(theme)}"><span class="theme-icon">${icon}</span><span class="theme-label">${themeLabel(theme)}</span></button>`;
}

function workspaceCard(ws: Workspace): string {
  const runs = listRuns(ws.id);
  const latest = runs[0];
  return `
    <article class="ws-card" data-id="${escapeHtml(ws.id)}">
      <a class="ws-card-main" href="${hrefFor({ name: "workspace", id: ws.id })}">
        <h3>${escapeHtml(ws.name)}</h3>
        <p class="ws-meta">@${escapeHtml(ws.username)}</p>
        <p class="ws-meta">
          ${runs.length} saved run${runs.length === 1 ? "" : "s"}
          ${latest ? `· latest ${escapeHtml(latest.month)}` : "· no audits yet"}
        </p>
      </a>
      <button type="button" class="btn btn-ghost btn-sm ws-delete" data-delete="${escapeHtml(ws.id)}">Delete</button>
    </article>`;
}

export function renderWorkspaceHome(root: HTMLElement): void {
  const workspaces = listWorkspaces();

  root.innerHTML = `
    <header class="app-top">
      <div class="shell app-top-inner">
        <a class="brand-mini" href="${hrefFor({ name: "docs" })}">Open<span>Hearth</span></a>
        <nav class="app-nav">
          <a href="${hrefFor({ name: "workspaces" })}" class="nav-link active">Workspaces</a>
          <a href="${hrefFor({ name: "docs" })}" class="nav-link">Docs</a>
          ${themeToggleMarkup()}
        </nav>
      </div>
    </header>

    <main class="shell app-main">
      <div class="app-heading">
        <div>
          <h1>Workspaces</h1>
          <p class="muted">Create a space per GitHub user you track. Runs stay in this browser.</p>
        </div>
      </div>

      <form class="ws-create audit-form" id="create-form" autocomplete="off">
        <div class="form-row ws-create-row">
          <div class="field field-username">
            <label for="ws-name">Workspace name</label>
            <input id="ws-name" name="name" type="text" placeholder="My OSS month" required />
          </div>
          <div class="field">
            <label for="ws-user">GitHub username</label>
            <input id="ws-user" name="username" type="text" placeholder="Ayush7614" required spellcheck="false" />
          </div>
          <div class="field field-action">
            <label>&nbsp;</label>
            <button type="submit" class="btn btn-primary">Create workspace</button>
          </div>
        </div>
      </form>

      <section class="ws-grid" id="ws-grid">
        ${
          workspaces.length === 0
            ? `<div class="empty"><strong>No workspaces yet</strong>Create one to run audits and track months over time.</div>`
            : workspaces.map(workspaceCard).join("")
        }
      </section>
    </main>
  `;

  bindTheme(root);

  root.querySelector("#create-form")?.addEventListener("submit", (e) => {
    e.preventDefault();
    const name = root.querySelector<HTMLInputElement>("#ws-name")!.value;
    const username = root.querySelector<HTMLInputElement>("#ws-user")!.value;
    const ws = createWorkspace(name, username);
    navigate({ name: "workspace", id: ws.id });
  });

  root.querySelectorAll<HTMLButtonElement>("[data-delete]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.delete;
      if (!id) return;
      if (!confirm("Delete this workspace and its saved runs?")) return;
      deleteWorkspace(id);
      renderWorkspaceHome(root);
    });
  });
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
