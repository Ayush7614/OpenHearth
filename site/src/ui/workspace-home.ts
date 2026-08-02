import { escapeHtml } from "../lib/dom";
import { hrefFor, navigate } from "../lib/router";
import { showToast } from "../lib/toast";
import { loadDemoData } from "../lib/demo";
import {
  createWorkspace,
  deleteWorkspace,
  getStoredToken,
  importAuditJson,
  isOnboarded,
  listRuns,
  listWorkspaces,
  markOnboarded,
  setStoredToken,
  type Workspace,
} from "../lib/storage";
import {
  fetchAuditJsonFromUrl,
  listAuditArtifacts,
  setAuthToken,
  validateAuth,
} from "@felix-ayush/openhearth-core";
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

function workspaceCard(ws: Workspace): string {
  const runs = listRuns(ws.id);
  const latest = [...runs].sort((a, b) => b.month.localeCompare(a.month))[0];
  return `
    <article class="ws-card" data-id="${escapeHtml(ws.id)}">
      <a class="ws-card-main" href="${hrefFor({ name: "workspace", id: ws.id })}">
        <h3>${escapeHtml(ws.name)}</h3>
        <p class="ws-meta">@${escapeHtml(ws.username)}</p>
        <p class="ws-meta">
          ${runs.length} saved run${runs.length === 1 ? "" : "s"}
          ${latest ? `· latest ${escapeHtml(latest.month)} · ${latest.insights.totalContributions} contribs` : "· no audits yet"}
        </p>
      </a>
      <button type="button" class="btn btn-ghost btn-sm ws-delete" data-delete="${escapeHtml(ws.id)}">Delete</button>
    </article>`;
}

function onboardingHtml(): string {
  if (isOnboarded() && listWorkspaces().length > 0) return "";
  return `
    <section class="onboard" id="onboard">
      <h2>Get started in 4 steps</h2>
      <ol class="onboard-steps">
        <li><strong>Create a workspace</strong> for the GitHub user you want to track.</li>
        <li><strong>Paste a PAT</strong> (optional but recommended) and run a full audit.</li>
        <li><strong>Save the month</strong> so OpenHearth can chart trends over time.</li>
        <li><strong>Import CLI JSON</strong> anytime — drop <code>openhearth audit … --json</code> output below.</li>
      </ol>
      <button type="button" class="btn btn-ghost btn-sm" id="dismiss-onboard">Got it</button>
    </section>`;
}

export function renderWorkspaceHome(root: HTMLElement): void {
  const workspaces = listWorkspaces();

  root.innerHTML = `
    <header class="app-top">
      <div class="shell app-top-inner">
        <a class="brand-mini" href="${hrefFor({ name: "docs" })}">Open<span>Hearth</span></a>
        <nav class="app-nav">
          <a href="${hrefFor({ name: "workspaces" })}" class="nav-link active">Workspaces</a>
          <a href="${hrefFor({ name: "board" })}" class="nav-link">Board</a>
          <a href="${hrefFor({ name: "docs" })}" class="nav-link">Docs</a>
          ${themeToggleMarkup()}
        </nav>
      </div>
    </header>

    <main class="shell app-main">
      <div class="app-heading">
        <div>
          <h1>Workspaces</h1>
          <p class="muted">One space per GitHub user. Track months locally — same engine as the CLI.</p>
        </div>
        <div class="app-heading-actions">
          <button type="button" class="btn btn-ghost btn-sm" id="load-demo">Load demo data</button>
        </div>
      </div>

      ${onboardingHtml()}
      <p class="hint security-note">
        Security: optional GitHub PATs stay in <code>sessionStorage</code> for this tab only and are sent only to
        <code>api.github.com</code>. Prefer a fine-grained token with public read. Never paste tokens into shared machines or chat.
      </p>

      <form class="ws-create audit-form" id="create-form" autocomplete="off">
        <div class="form-row ws-create-row">
          <div class="field field-username">
            <label for="ws-name">Workspace name</label>
            <input id="ws-name" name="name" type="text" placeholder="My OSS tracking" required />
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

      <section class="import-panel" id="import-panel">
        <h2>Import CLI JSON</h2>
        <p class="muted">Drop or choose a file from <code>openhearth audit USER --month YYYY-MM --json report.json</code>. Creates a workspace if needed.</p>
        <label class="dropzone" id="dropzone">
          <input type="file" id="import-file" accept="application/json,.json" hidden />
          <span>Drop JSON here or click to choose</span>
        </label>
        <p class="hint" id="import-status" aria-live="polite"></p>
      </section>

      <section class="import-panel" id="action-import-panel">
        <h2>Import from URL / Actions</h2>
        <p class="muted">Paste a raw audit JSON URL (gist raw, artifact mirror, or CI export). Optional: list recent OpenHearth artifacts for a repo.</p>
        <div class="form-row ws-create-row">
          <div class="field" style="flex:1">
            <label for="import-url">Audit JSON URL</label>
            <input id="import-url" type="url" placeholder="https://…/audit.json" spellcheck="false" />
          </div>
          <div class="field field-action">
            <label>&nbsp;</label>
            <button type="button" class="btn btn-primary" id="import-url-btn">Import URL</button>
          </div>
        </div>
        <div class="form-row ws-create-row" style="margin-top:.75rem">
          <div class="field" style="flex:1">
            <label for="actions-repo">Actions repo</label>
            <input id="actions-repo" type="text" placeholder="owner/repo" spellcheck="false" />
          </div>
          <div class="field field-action">
            <label>&nbsp;</label>
            <button type="button" class="btn btn-ghost" id="list-artifacts-btn">List artifacts</button>
          </div>
        </div>
        <p class="hint" id="action-import-status" aria-live="polite"></p>
        <ul class="hidden-list" id="artifact-list"></ul>
      </section>

      <section class="import-panel" id="auth-wizard">
        <h2>Auth wizard</h2>
        <p class="muted">Paste a fine-grained PAT for this tab only, then validate Search API quota. Prefer public-read + <code>gist</code> if you publish short links.</p>
        <div class="form-row ws-create-row">
          <div class="field" style="flex:1">
            <label for="home-token">Personal access token</label>
            <input id="home-token" type="password" placeholder="ghp_… or github_pat_…" autocomplete="off" spellcheck="false" />
          </div>
          <div class="field field-action">
            <label>&nbsp;</label>
            <button type="button" class="btn btn-ghost" id="validate-token-btn">Save &amp; check</button>
          </div>
        </div>
        <p class="hint" id="auth-wizard-status"></p>
      </section>

      <section class="ws-grid" id="ws-grid">
        ${
          workspaces.length === 0
            ? `<div class="empty empty-hero">
                <strong>No workspaces yet</strong>
                <p>Create one above, or import a CLI JSON export to start tracking.</p>
                <div class="skeleton-stack" aria-hidden="true">
                  <div class="skeleton sk-card"></div>
                  <div class="skeleton sk-card"></div>
                  <div class="skeleton sk-card"></div>
                </div>
              </div>`
            : workspaces.map(workspaceCard).join("")
        }
      </section>
    </main>
  `;

  bindTheme(root);

  root.querySelector("#load-demo")?.addEventListener("click", () => {
    const result = loadDemoData();
    showToast(
      result.seeded ? "Demo workspaces loaded — open Board to compare" : "Demo users already present",
      result.seeded ? "ok" : "info"
    );
    renderWorkspaceHome(root);
  });

  root.querySelector("#dismiss-onboard")?.addEventListener("click", () => {
    markOnboarded();
    root.querySelector("#onboard")?.remove();
  });

  root.querySelector("#create-form")?.addEventListener("submit", (e) => {
    e.preventDefault();
    const name = root.querySelector<HTMLInputElement>("#ws-name")!.value;
    const username = root.querySelector<HTMLInputElement>("#ws-user")!.value;
    const ws = createWorkspace(name, username);
    markOnboarded();
    navigate({ name: "workspace", id: ws.id });
  });

  root.querySelectorAll<HTMLButtonElement>("[data-delete]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.delete;
      if (!id) return;
      const ws = workspaces.find((w) => w.id === id);
      const label = ws ? `@${ws.username}` : "this workspace";
      if (!confirm(`Delete ${label} and all saved runs? This cannot be undone.`)) return;
      deleteWorkspace(id);
      renderWorkspaceHome(root);
    });
  });

  const status = root.querySelector<HTMLElement>("#import-status")!;
  const fileInput = root.querySelector<HTMLInputElement>("#import-file")!;
  const dropzone = root.querySelector<HTMLElement>("#dropzone")!;

  async function handleFile(file: File): Promise<void> {
    status.textContent = "Importing…";
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      const { workspace, run } = importAuditJson(data, { createIfMissing: true });
      markOnboarded();
      status.textContent = `Imported ${run.month} for @${workspace.username}. Opening workspace…`;
      setTimeout(() => navigate({ name: "workspace", id: workspace.id }), 500);
    } catch (err) {
      status.textContent = err instanceof Error ? err.message : String(err);
      status.classList.add("error-text");
    }
  }

  fileInput.addEventListener("change", () => {
    const f = fileInput.files?.[0];
    if (f) void handleFile(f);
  });

  dropzone.addEventListener("dragover", (e) => {
    e.preventDefault();
    dropzone.classList.add("drag");
  });
  dropzone.addEventListener("dragleave", () => dropzone.classList.remove("drag"));
  dropzone.addEventListener("drop", (e) => {
    e.preventDefault();
    dropzone.classList.remove("drag");
    const f = e.dataTransfer?.files?.[0];
    if (f) void handleFile(f);
  });

  const actionStatus = root.querySelector<HTMLElement>("#action-import-status")!;
  const artifactList = root.querySelector<HTMLElement>("#artifact-list")!;
  const homeToken = root.querySelector<HTMLInputElement>("#home-token")!;
  homeToken.value = getStoredToken();

  root.querySelector("#import-url-btn")?.addEventListener("click", () => {
    const url = root.querySelector<HTMLInputElement>("#import-url")?.value.trim() ?? "";
    if (!url) {
      showToast("Paste an audit JSON URL", "err");
      return;
    }
    actionStatus.textContent = "Fetching…";
    void (async () => {
      try {
        const data = await fetchAuditJsonFromUrl(url);
        const { workspace, run } = importAuditJson(data, { createIfMissing: true });
        markOnboarded();
        actionStatus.textContent = `Imported ${run.month} for @${workspace.username}`;
        showToast("Imported from URL", "ok");
        setTimeout(() => navigate({ name: "workspace", id: workspace.id }), 400);
      } catch (err) {
        actionStatus.textContent = err instanceof Error ? err.message : String(err);
        showToast("Import failed", "err");
      }
    })();
  });

  root.querySelector("#list-artifacts-btn")?.addEventListener("click", () => {
    const repo = root.querySelector<HTMLInputElement>("#actions-repo")?.value.trim() ?? "";
    const token = getStoredToken() || homeToken.value.trim();
    if (!repo) {
      showToast("Enter owner/repo", "err");
      return;
    }
    if (!token) {
      showToast("Save a PAT first (Actions API needs auth)", "err");
      return;
    }
    setAuthToken(token);
    actionStatus.textContent = "Listing artifacts…";
    artifactList.innerHTML = "";
    void (async () => {
      try {
        const artifacts = await listAuditArtifacts(repo, 12);
        if (artifacts.length === 0) {
          actionStatus.textContent = "No matching OpenHearth/audit artifacts found (or none recent).";
          return;
        }
        actionStatus.textContent = `Found ${artifacts.length} artifact(s). Download ZIP from Actions UI, then import the JSON file above — browser cannot unzip private artifact URLs directly.`;
        artifactList.innerHTML = artifacts
          .map(
            (a) =>
              `<li><span>${escapeHtml(a.name)}</span><span>${escapeHtml(a.createdAt.slice(0, 10))}</span></li>`
          )
          .join("");
      } catch (err) {
        actionStatus.textContent = err instanceof Error ? err.message : String(err);
      }
    })();
  });

  root.querySelector("#validate-token-btn")?.addEventListener("click", () => {
    const token = homeToken.value.trim();
    setStoredToken(token);
    setAuthToken(token);
    const statusEl = root.querySelector<HTMLElement>("#auth-wizard-status")!;
    statusEl.textContent = "Checking…";
    void (async () => {
      const result = await validateAuth(token);
      statusEl.textContent = result.message;
      showToast(result.ok ? "Auth OK" : "Auth needs attention", result.ok ? "ok" : "err");
    })();
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
