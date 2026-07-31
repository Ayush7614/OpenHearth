import {
  getStoredTheme,
  themeLabel,
  themeToggleHint,
  toggleTheme,
  type Theme,
} from "../lib/theme";

const FEATURES = [
  {
    title: "Hidden repo detection",
    body: "Estimates how many repositories GitHub’s activity sidebar hides behind “N repositories not shown.”",
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
    title: "One-command full audit",
    body: "PRs, issues, and reviews together with merge rate, busiest day, and top repos.",
  },
  {
    title: "JSON & CSV export",
    body: "Pipe results into spreadsheets, dashboards, or your own tooling.",
  },
  {
    title: "Nothing like it",
    body: "GitHub search shows lists; OpenHearth audits, compares against the feed, and reports what’s missing.",
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
          <a href="#install" class="nav-link">Install</a>
          <a href="#features" class="nav-link">Features</a>
          <a href="https://github.com/Ayush7614/GitBook" target="_blank" rel="noopener" class="nav-link">GitHub</a>
          ${themeToggleMarkup(theme)}
        </nav>

        <p class="eyebrow">Open-source contribution audit</p>
        <h1 class="brand">Open<span>Hearth</span></h1>
        <p class="tagline">
          GitHub’s activity feed truncates your work. OpenHearth finds <em>everything</em> —
          via a CLI that queries the Search API and reports what your profile sidebar hides.
        </p>

        <div class="hero-actions">
          <a href="#install" class="btn btn-primary">Get started</a>
          <a href="https://www.npmjs.com/package/openhearth" target="_blank" rel="noopener" class="btn btn-ghost">npm</a>
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
          OpenHearth runs where developers already work: your terminal. The website explains the
          tool; the CLI does the audit.
        </p>
      </div>
    </section>

    <section class="section" id="install">
      <div class="shell">
        <h2>Install & run</h2>
        <p class="muted">No global install required. Node 20+ recommended.</p>

        <div class="code-block">
          <div class="code-header">
            <span>Full audit</span>
            <button type="button" class="copy-btn" data-copy="npx openhearth audit Ayush7614 --month 2026-07">Copy</button>
          </div>
          <pre><code>npx openhearth audit Ayush7614 --month 2026-07</code></pre>
        </div>

        <div class="code-block">
          <div class="code-header">
            <span>Hidden repos report</span>
            <button type="button" class="copy-btn" data-copy="npx openhearth hidden Ayush7614 --month 2026-07">Copy</button>
          </div>
          <pre><code>npx openhearth hidden Ayush7614 --month 2026-07</code></pre>
        </div>

        <div class="code-block">
          <div class="code-header">
            <span>Export JSON</span>
            <button type="button" class="copy-btn" data-copy="npx openhearth audit USER --month 2026-07 --json report.json">Copy</button>
          </div>
          <pre><code>npx openhearth audit USER --month 2026-07 --json report.json</code></pre>
        </div>

        <p class="hint">
          Set <code>GITHUB_TOKEN</code> for higher rate limits. Classic PAT with public read is enough.
        </p>
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
          <div class="ref-row"><code>openhearth hidden &lt;user&gt;</code><span>Quick hidden-repo report</span></div>
          <div class="ref-row"><code>--month YYYY-MM</code><span>Audit a calendar month</span></div>
          <div class="ref-row"><code>--from / --to</code><span>Custom date range</span></div>
          <div class="ref-row"><code>--kind pr|issue|review|all</code><span>Filter by contribution type</span></div>
          <div class="ref-row"><code>--json / --csv</code><span>Export results</span></div>
        </div>
      </div>
    </section>

    <footer class="footer">
      <div class="shell">
        <span>OpenHearth · CLI on npm · site for docs</span>
        <span><a href="https://github.com/Ayush7614/GitBook" target="_blank" rel="noopener">Source</a></span>
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
