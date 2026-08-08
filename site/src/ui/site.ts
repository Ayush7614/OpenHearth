import {
  getStoredTheme,
  themeLabel,
  themeToggleHint,
  toggleTheme,
  type Theme,
} from "../lib/theme";

const FEATURES = [
  {
    title: "Public report cards",
    body: "Share or portfolio URLs encode a full month snapshot — Feed vs Search proof included.",
  },
  {
    title: "Team / org radar",
    body: "Paste a username list on the board or run openhearth radar --users-file for multi-user audits.",
  },
  {
    title: "Feed vs Search proof",
    body: "Side-by-side what the activity sidebar would show versus what Search actually found.",
  },
  {
    title: "Year timeline",
    body: "Saved months render as a year heatmap so hidden work shows up across the calendar.",
  },
  {
    title: "Repo contributor lens",
    body: "openhearth lens USER owner/repo — authored vs reviews and a core/drive-by role hint.",
  },
  {
    title: "Monthly digest + forges",
    body: "digest turns audit JSON into Slack/Discord markdown. Multi-forge adapters stub GitLab/Bitbucket.",
  },
];

function themeToggleMarkup(theme: Theme): string {
  const icon = theme === "dark" ? "☀" : "☾";
  return `<button type="button" class="theme-toggle" id="theme-toggle" aria-label="${themeToggleHint(theme)}"><span class="theme-icon">${icon}</span><span class="theme-label">${themeLabel(theme)}</span></button>`;
}

export function renderSite(root: HTMLElement): void {
  const theme = getStoredTheme();

  root.innerHTML = `
    <header class="hero">
      <div class="shell">
        <nav class="topbar">
          <a href="#/app" class="nav-link">Workspaces</a>
          <a href="#/app/board" class="nav-link">Board</a>
          <a href="#install" class="nav-link">Install</a>
          <a href="#features" class="nav-link">Features</a>
          <a href="https://www.npmjs.com/package/@felix-ayush/openhearth" target="_blank" rel="noopener" class="nav-link">npm</a>
          <a href="https://github.com/Ayush7614/OpenHearth" target="_blank" rel="noopener" class="nav-link">GitHub</a>
          ${themeToggleMarkup(theme)}
        </nav>

        <p class="eyebrow">CLI + browser workspaces · track what the feed hides</p>
        <h1 class="brand">Open<span>Hearth</span></h1>
        <p class="tagline">
          GitHub’s activity feed truncates your work. OpenHearth audits via
          <strong>CLI or browser workspaces</strong> — same Search API engine,
          saved month-over-month so you can track everything.
        </p>

        <div class="hero-actions">
          <a href="#/app" class="btn btn-primary">Open workspaces</a>
          <a href="#install" class="btn btn-ghost">CLI install</a>
        </div>
      </div>
    </header>

    <section class="section problem">
      <div class="shell">
        <h2>The problem</h2>
        <p>
          Heavy contributors often see <strong>“Opened 394 pull requests in 76 repositories”</strong>
          followed by <strong>“51 repositories not shown.”</strong> The green graph and activity
          sidebar were never meant as a complete ledger — especially after the AI-era OSS boom.
        </p>
        <p class="muted">
          Use the <a href="#/app">workspace UI</a> in the browser, or the CLI
          <code>@felix-ayush/openhearth</code> on npm — both share the same audit engine.
        </p>
      </div>
    </section>

    <section class="section" id="install">
      <div class="shell">
        <h2>Install &amp; run</h2>
        <p class="muted">
          Browser <a href="#/app">workspaces</a> or CLI package <code>@felix-ayush/openhearth</code>. Node 20+ for the CLI.
        </p>

        <div class="code-block">
          <div class="code-header">
            <span>Run without installing</span>
            <button type="button" class="copy-btn" data-copy="npx @felix-ayush/openhearth audit Ayush7614 --month 2026-07">Copy</button>
          </div>
          <pre><code>npx @felix-ayush/openhearth audit Ayush7614 --month 2026-07</code></pre>
        </div>

        <div class="code-block">
          <div class="code-header">
            <span>Hidden repos report</span>
            <button type="button" class="copy-btn" data-copy="npx @felix-ayush/openhearth hidden Ayush7614 --month 2026-07">Copy</button>
          </div>
          <pre><code>npx @felix-ayush/openhearth hidden Ayush7614 --month 2026-07</code></pre>
        </div>

        <div class="code-block">
          <div class="code-header">
            <span>Check auth &amp; rate limits</span>
            <button type="button" class="copy-btn" data-copy="npx @felix-ayush/openhearth doctor">Copy</button>
          </div>
          <pre><code>npx @felix-ayush/openhearth doctor</code></pre>
        </div>

        <div class="code-block">
          <div class="code-header">
            <span>Global install</span>
            <button type="button" class="copy-btn" data-copy="npm install -g @felix-ayush/openhearth">Copy</button>
          </div>
          <pre><code>npm install -g @felix-ayush/openhearth
openhearth audit USERNAME --month 2026-07</code></pre>
        </div>
      </div>
    </section>

    <section class="section" id="auth">
      <div class="shell">
        <h2>Authentication</h2>
        <p>
          Without a token, GitHub’s unauthenticated Search API rate-limits quickly (~60 requests/hour).
          Set a PAT so audits and back-to-back commands finish reliably:
        </p>
        <div class="code-block">
          <div class="code-header">
            <span>Recommended</span>
            <button type="button" class="copy-btn" data-copy="export GITHUB_TOKEN=YOUR_TOKEN_HERE">Copy</button>
          </div>
          <pre><code>export GITHUB_TOKEN=YOUR_TOKEN_HERE
npx @felix-ayush/openhearth audit USERNAME --month 2026-07</code></pre>
        </div>
        <p class="hint">
          Classic or fine-grained PAT with public repository read is enough. Never commit or paste tokens into chat.
          If you hit a limit, the CLI explains how to fix it — or run <code>openhearth doctor</code>.
        </p>
      </div>
    </section>

    <section class="section" id="action">
      <div class="shell">
        <h2>GitHub Action</h2>
        <p class="muted">
          This repo ships a <strong>Contribution Audit</strong> workflow — run on demand or on a monthly schedule.
          It uploads JSON/CSV artifacts for the chosen user and month.
        </p>
        <div class="code-block">
          <div class="code-header">
            <span>Actions → Contribution Audit → Run workflow</span>
          </div>
          <pre><code># workflow_dispatch inputs:
#   username  (defaults to repository owner)
#   month     (YYYY-MM, defaults to previous month)

# Or wait for the 1st-of-month cron schedule</code></pre>
        </div>
      </div>
    </section>

    <section class="section" id="features">
      <div class="shell">
        <h2>What makes it different</h2>
        <div class="feature-grid">
          ${FEATURES.map(
            (f) => `
            <article class="feature-card">
              <h3>${f.title}</h3>
              <p>${f.body}</p>
            </article>`
          ).join("")}
        </div>
      </div>
    </section>

    <section class="section">
      <div class="shell">
        <h2>CLI reference</h2>
        <div class="ref-table">
          <div class="ref-row"><code>openhearth audit &lt;user&gt;</code><span>Full PR + issue + review audit</span></div>
          <div class="ref-row"><code>openhearth hidden &lt;user&gt;</code><span>Ranked likely-hidden repos</span></div>
          <div class="ref-row"><code>openhearth proof &lt;user&gt;</code><span>Feed vs Search side-by-side</span></div>
          <div class="ref-row"><code>openhearth radar --users-file</code><span>Team / org multi-user audit</span></div>
          <div class="ref-row"><code>openhearth overlap A B</code><span>Shared repositories</span></div>
          <div class="ref-row"><code>openhearth lens user repo</code><span>Contributor lens for one repo</span></div>
          <div class="ref-row"><code>openhearth share / portfolio</code><span>Public report-card URLs</span></div>
          <div class="ref-row"><code>openhearth digest audit.json</code><span>Slack/Discord digest markdown</span></div>
          <div class="ref-row"><code>openhearth doctor</code><span>Auth + rate-limit check</span></div>
          <div class="ref-row"><code>--month / --year</code><span>Calendar month or full year</span></div>
          <div class="ref-row"><code>--json / --csv</code><span>Export results</span></div>
        </div>
      </div>
    </section>

    <footer class="footer">
      <div class="shell">
        <span>OpenHearth · <a href="#/app">workspaces</a> · <a href="https://www.npmjs.com/package/@felix-ayush/openhearth" target="_blank" rel="noopener">CLI</a></span>
        <span><a href="https://github.com/Ayush7614/OpenHearth" target="_blank" rel="noopener">Source</a></span>
      </div>
    </footer>
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

  root.querySelectorAll<HTMLButtonElement>(".copy-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const text = btn.dataset.copy ?? "";
      try {
        await navigator.clipboard.writeText(text);
        btn.textContent = "Copied!";
        setTimeout(() => {
          btn.textContent = "Copy";
        }, 1500);
      } catch {
        btn.textContent = "Failed";
      }
    });
  });
}
