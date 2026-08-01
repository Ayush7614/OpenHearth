import {
  getStoredTheme,
  themeLabel,
  themeToggleHint,
  toggleTheme,
  type Theme,
} from "../lib/theme";

const FEATURES = [
  {
    title: "Browser workspaces",
    body: "Create spaces per user, save months, chart trends, share reports, and import CLI JSON — all local in your browser.",
  },
  {
    title: "Multi-user board",
    body: "Compare every workspace side by side with latest totals and month-over-month deltas.",
  },
  {
    title: "Full Search API inventory",
    body: "Lists every PR, issue, and review in a date range — not the truncated profile feed.",
  },
  {
    title: "Auto date-splitting",
    body: "When a month exceeds GitHub’s 1000-result search cap, splits the range automatically.",
  },
  {
    title: "Doctor + clear rate limits",
    body: "openhearth doctor checks auth and Search API quota. Rate-limit errors tell you exactly how to fix them.",
  },
  {
    title: "CLI + GitHub Action",
    body: "Same engine in the terminal and in CI — monthly artifacts when you want automation.",
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
          <a href="#demo" class="nav-link">Demo</a>
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

    <section class="section" id="demo">
      <div class="shell">
        <h2>What it looks like</h2>
        <p class="muted">Sample terminal output from a monthly audit.</p>
        <div class="terminal" role="img" aria-label="Sample OpenHearth CLI output">
          <div class="terminal-chrome">
            <span></span><span></span><span></span>
            <em>openhearth · audit</em>
          </div>
          <pre class="terminal-body"><code><span class="t-dim">$</span> npx @felix-ayush/openhearth hidden USER --month 2026-07

<span class="t-bold">OpenHearth</span> <span class="t-dim">· contribution audit</span>

<span class="t-bold">Summary</span> <span class="t-dim">· @USER · 2026-07</span>
Total contributions   <span class="t-bold">494</span>
Unique repositories   <span class="t-bold">78</span>
PR merge rate         <span class="t-bold">51%</span>

<span class="t-warn">⚠ Hidden by activity feed</span>
Feed shows ~25 busiest repos; Search API found 78.
~53 lower-activity repositories are likely truncated.

<span class="t-bold">Likely hidden repositories</span> <span class="t-dim">· least activity first</span>
· small-org/side-project 1
· another/low-activity 2
· … and 51 more</code></pre>
        </div>
      </div>
    </section>

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
          <div class="ref-row"><code>openhearth doctor</code><span>Auth + rate-limit check</span></div>
          <div class="ref-row"><code>--month YYYY-MM</code><span>Audit a calendar month</span></div>
          <div class="ref-row"><code>--from / --to</code><span>Custom date range</span></div>
          <div class="ref-row"><code>--kind pr|issue|review|all</code><span>Filter by contribution type</span></div>
          <div class="ref-row"><code>--token TOKEN</code><span>GitHub PAT (or GITHUB_TOKEN env)</span></div>
          <div class="ref-row"><code>--json / --csv</code><span>Export results</span></div>
          <div class="ref-row"><code>-V, --version</code><span>Print CLI version</span></div>
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
