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
          <a href="https://www.npmjs.com/package/@felix-ayush/openhearth" target="_blank" rel="noopener" class="nav-link">npm</a>
          <a href="https://github.com/Ayush7614/OpenHearth" target="_blank" rel="noopener" class="nav-link">GitHub</a>
          ${themeToggleMarkup(theme)}
        </nav>

        <p class="eyebrow">CLI on npm · this site is docs only</p>
        <h1 class="brand">Open<span>Hearth</span></h1>
        <p class="tagline">
          GitHub’s activity feed truncates your work. OpenHearth is a
          <strong>terminal CLI</strong> that queries the Search API and reports what your
          profile sidebar hides. There is no web audit app — install the package and run it.
        </p>

        <div class="hero-actions">
          <a href="#install" class="btn btn-primary">Install the CLI</a>
          <a href="https://www.npmjs.com/package/@felix-ayush/openhearth" target="_blank" rel="noopener" class="btn btn-ghost">@felix-ayush/openhearth</a>
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
          This website only explains the product. The real tool is
          <code>@felix-ayush/openhearth</code> on npm.
        </p>
      </div>
    </section>

    <section class="section" id="install">
      <div class="shell">
        <h2>Install &amp; run</h2>
        <p class="muted">
          One package: <code>@felix-ayush/openhearth</code>. Node 20+. No browser UI.
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
            <span>Global install</span>
            <button type="button" class="copy-btn" data-copy="npm install -g @felix-ayush/openhearth">Copy</button>
          </div>
          <pre><code>npm install -g @felix-ayush/openhearth
openhearth audit USERNAME --month 2026-07</code></pre>
        </div>

        <div class="code-block">
          <div class="code-header">
            <span>Export JSON</span>
            <button type="button" class="copy-btn" data-copy="npx @felix-ayush/openhearth audit USER --month 2026-07 --json report.json">Copy</button>
          </div>
          <pre><code>npx @felix-ayush/openhearth audit USER --month 2026-07 --json report.json</code></pre>
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
          <div class="ref-row"><code>--token TOKEN</code><span>GitHub PAT (or GITHUB_TOKEN env)</span></div>
          <div class="ref-row"><code>--json / --csv</code><span>Export results</span></div>
        </div>
      </div>
    </section>

    <footer class="footer">
      <div class="shell">
        <span>OpenHearth · <a href="https://www.npmjs.com/package/@felix-ayush/openhearth" target="_blank" rel="noopener">@felix-ayush/openhearth</a> · docs site only</span>
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
