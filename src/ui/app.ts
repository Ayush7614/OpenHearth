import { getRateLimit, getStoredToken, setStoredToken } from "../api/github";
import { runAudit, type AuditResult } from "../audit/aggregate";
import { exportCsv, exportJson } from "../audit/export";
import { monthRange, type AuditKind, type DateRange } from "../audit/queries";
import { APP_NAME, APP_TAGLINE } from "../lib/brand";
import {
  getStoredTheme,
  themeLabel,
  themeToggleHint,
  toggleTheme,
  type Theme,
} from "../lib/theme";

type TabCache = Partial<Record<AuditKind, AuditResult>>;

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

function currentYear(): number {
  return new Date().getFullYear();
}

function yearOptionsHtml(): string {
  const y = currentYear();
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

function themeToggleMarkup(theme: Theme): string {
  const icon = theme === "dark" ? "☀" : "☾";
  return `<button type="button" class="theme-toggle" id="theme-toggle" aria-label="${themeToggleHint(theme)}" title="${themeToggleHint(theme)}"><span class="theme-icon" aria-hidden="true">${icon}</span><span class="theme-label">${themeLabel(theme)}</span></button>`;
}

export function renderApp(root: HTMLElement): void {
  const theme = getStoredTheme();

  root.innerHTML = `
    <header class="hero">
      <div class="shell">
        <div class="topbar">${themeToggleMarkup(theme)}</div>
        <h1 class="brand">Open<span>Hearth</span></h1>
        <p class="tagline">${APP_TAGLINE}</p>

        <form class="audit-form" id="audit-form" autocomplete="off">
          <div class="form-row">
            <div class="field field-username">
              <label for="username">GitHub username</label>
              <input id="username" name="username" type="text" placeholder="Ayush7614" required spellcheck="false" />
            </div>
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
              <button type="submit" class="btn btn-primary" id="run-btn">Audit</button>
            </div>
          </div>

          <div class="token-row">
            <div class="field">
              <label for="token">Personal access token (optional)</label>
              <input id="token" name="token" type="password" placeholder="ghp_… raises search rate limits" autocomplete="off" />
            </div>
            <div class="field">
              <label>&nbsp;</label>
              <button type="button" class="btn btn-ghost" id="save-token">Save for session</button>
            </div>
          </div>
          <p class="hint">
            Token stays in sessionStorage and is sent only to api.github.com.
            Classic PAT with public read access is enough. Without a token, Search API is ~10 req/min.
          </p>
        </form>

        <div class="status-bar" id="status" aria-live="polite"></div>
      </div>
    </header>

    <main class="results shell" id="results" hidden></main>

    <footer class="footer">
      <div class="shell">
        <span>${APP_NAME} · contribution audit</span>
        <span><a href="https://github.com/Ayush7614/GitBook" target="_blank" rel="noopener">Source</a></span>
      </div>
    </footer>
  `;

  root.querySelector<HTMLButtonElement>("#theme-toggle")?.addEventListener("click", () => {
    const next = toggleTheme();
    const btn = root.querySelector<HTMLButtonElement>("#theme-toggle");
    if (!btn) return;
    btn.setAttribute("aria-label", themeToggleHint(next));
    btn.title = themeToggleHint(next);
    const icon = btn.querySelector(".theme-icon");
    const label = btn.querySelector(".theme-label");
    if (icon) icon.textContent = next === "dark" ? "☀" : "☾";
    if (label) label.textContent = themeLabel(next);
  });

  const form = root.querySelector<HTMLFormElement>("#audit-form")!;
  const usernameInput = root.querySelector<HTMLInputElement>("#username")!;
  const monthSelect = root.querySelector<HTMLSelectElement>("#month")!;
  const yearSelect = root.querySelector<HTMLSelectElement>("#year")!;
  const tokenInput = root.querySelector<HTMLInputElement>("#token")!;
  const saveTokenBtn = root.querySelector<HTMLButtonElement>("#save-token")!;
  const runBtn = root.querySelector<HTMLButtonElement>("#run-btn")!;
  const statusEl = root.querySelector<HTMLElement>("#status")!;
  const resultsEl = root.querySelector<HTMLElement>("#results")!;

  tokenInput.value = getStoredToken();

  let activeTab: AuditKind = "pr";
  let cache: TabCache = {};
  let lastUser = "";
  let lastRange: DateRange | null = null;
  let loading = false;

  function setStatus(html: string): void {
    statusEl.innerHTML = html;
    renderRate();
  }

  function renderRate(): void {
    const rate = getRateLimit();
    const existing = statusEl.querySelector(".rate");
    if (existing) existing.remove();
    if (rate.remaining < 0) return;
    const span = document.createElement("span");
    span.className = "rate";
    span.textContent = `API remaining: ${rate.remaining}/${rate.limit}`;
    statusEl.appendChild(span);
  }

  saveTokenBtn.addEventListener("click", () => {
    setStoredToken(tokenInput.value);
    setStatus(`<span>Token ${tokenInput.value.trim() ? "saved" : "cleared"} for this session.</span>`);
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (loading) return;

    const username = usernameInput.value.trim().replace(/^@/, "");
    if (!username) return;

    if (tokenInput.value.trim() !== getStoredToken()) {
      setStoredToken(tokenInput.value);
    }

    const year = Number(yearSelect.value);
    const month = Number(monthSelect.value);
    const range = monthRange(year, month);

    lastUser = username;
    lastRange = range;
    cache = {};
    activeTab = "pr";
    resultsEl.hidden = false;

    await loadTab("pr");
  });

  async function loadTab(kind: AuditKind): Promise<void> {
    if (!lastUser || !lastRange) return;

    if (cache[kind]) {
      activeTab = kind;
      renderResults();
      return;
    }

    loading = true;
    runBtn.disabled = true;
    setStatus(`<span class="progress">Loading ${labelFor(kind)}…</span>`);

    try {
      const result = await runAudit(lastUser, kind, lastRange, (msg) => {
        setStatus(`<span class="progress">${escapeHtml(msg)}</span>`);
      });
      cache[kind] = result;
      activeTab = kind;
      setStatus(
        `<span>Loaded ${result.total.toLocaleString()} ${labelFor(kind).toLowerCase()} across ${result.repos.length} repositories.</span>`
      );
      renderResults();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setStatus(`<span class="error">${escapeHtml(message)}</span>`);
      renderResults();
    } finally {
      loading = false;
      runBtn.disabled = false;
    }
  }

  function renderResults(): void {
    const current = cache[activeTab];
    const counts = {
      pr: cache.pr?.total,
      issue: cache.issue?.total,
      review: cache.review?.total,
    };

    const rangeLabel = lastRange
      ? `${MONTHS[Number(monthSelect.value) - 1]} ${yearSelect.value}`
      : "";

    resultsEl.innerHTML = `
      <div class="summary">
        <h2>@${escapeHtml(lastUser)}</h2>
        <p>${escapeHtml(rangeLabel)} · full Search API inventory (not the truncated activity feed)</p>
        <div class="summary-actions">
          <button type="button" class="btn btn-ghost btn-sm" id="export-json" ${current ? "" : "disabled"}>Export JSON</button>
          <button type="button" class="btn btn-ghost btn-sm" id="export-csv" ${current ? "" : "disabled"}>Export CSV</button>
        </div>
      </div>

      <div class="tabs" role="tablist">
        ${tabButton("pr", "Pull Requests", counts.pr)}
        ${tabButton("issue", "Issues", counts.issue)}
        ${tabButton("review", "Reviews", counts.review)}
      </div>

      <div id="tab-panel">${current ? renderRepoList(current) : emptyPanel(activeTab)}</div>
    `;

    resultsEl.querySelectorAll<HTMLButtonElement>(".tab").forEach((btn) => {
      btn.addEventListener("click", () => {
        const kind = btn.dataset.kind as AuditKind;
        void loadTab(kind);
      });
    });

    resultsEl.querySelectorAll<HTMLButtonElement>(".repo-header").forEach((btn) => {
      btn.addEventListener("click", () => {
        btn.closest(".repo")?.classList.toggle("open");
      });
    });

    resultsEl.querySelector("#export-json")?.addEventListener("click", () => {
      if (current) exportJson(current);
    });
    resultsEl.querySelector("#export-csv")?.addEventListener("click", () => {
      if (current) exportCsv(current);
    });
  }

  function tabButton(kind: AuditKind, label: string, count?: number): string {
    const countHtml =
      count === undefined
        ? ""
        : `<span class="count">${count.toLocaleString()}</span>`;
    return `<button type="button" class="tab ${activeTab === kind ? "active" : ""}" data-kind="${kind}" role="tab">${label}${countHtml}</button>`;
  }

  function emptyPanel(kind: AuditKind): string {
    if (loading) {
      return `<div class="empty"><strong>Loading</strong>Fetching ${labelFor(kind).toLowerCase()}…</div>`;
    }
    return `<div class="empty"><strong>Not loaded yet</strong>Select this tab to fetch ${labelFor(kind).toLowerCase()} for the chosen range.</div>`;
  }

  function renderRepoList(result: AuditResult): string {
    if (result.total === 0) {
      return `<div class="empty"><strong>Nothing found</strong>No ${labelFor(result.kind).toLowerCase()} for @${escapeHtml(result.username)} in this range.</div>`;
    }

    const showMerged = result.kind === "pr" || result.kind === "review";
    const headline = `<p style="margin:0 0 1rem;color:var(--ink-muted)"><strong style="color:var(--ink)">${result.total.toLocaleString()}</strong> ${labelFor(result.kind).toLowerCase()} across <strong style="color:var(--ink)">${result.repos.length}</strong> repositories</p>`;

    const repos = result.repos
      .map((repo) => {
        const pills = [
          showMerged && repo.merged
            ? `<span class="pill merged">${repo.merged} merged</span>`
            : "",
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
              <span class="item-meta">${formatShortDate(item.createdAt)}</span>
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

    return `${headline}<div class="repo-list">${repos}</div>`;
  }
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

function formatShortDate(iso: string): string {
  return iso.slice(0, 10);
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeAttr(s: string): string {
  return escapeHtml(s).replace(/'/g, "&#39;");
}
