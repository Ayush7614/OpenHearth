# Changelog

All notable changes to OpenHearth are documented here.

## [2.8.2] - 2026-08-08

### Changed
- CLI ASCII banner is now **ALL-CAPS `OPENHEARTH`** in a **red** terminal palette (OpenClaude-style energy, red instead of orange).
- CLI human-facing labels/messages print in **UPPERCASE**; repo names and usernames stay as returned by GitHub.
- README / npm hero banner updated to the red ALL-CAPS mark; removed landing screenshot grid from README.
- Site landing: removed the “What it looks like” terminal mockup section.

### Fixed
- Align Action / docs / ROADMAP / package versions to **2.8.2**.

## [2.8.1] - 2026-08-08

### Added
- Colorful CLI ASCII banner image on GitHub README (`docs/images/openhearth-cli-banner.png`) and in the npm package (`banner.png`) so npmjs.com can render it.

### Fixed
- CLI ASCII banner uses a correct figlet `big` **OpenHearth** wordmark (previous mashup misread as garbage letters).
- Align **Action / docs / ROADMAP / README** pins to **2.8.1** (were still on 2.7.0 / older).
- Root workspace dep on `@felix-ayush/openhearth` linked as `*` (was stale `^2.7.0`).

## [2.8.0] - 2026-08-08

### Added
- **ASCII CLI banner + welcome line.** Every `openhearth` command now prints a colorful rainbow-gradient "OpenHearth" ASCII logo and a welcome line before producing output. `--quiet` / `--json` / `--csv` suppress the banner so scripts stay parseable. New `packages/cli/src/banner.ts` module (`renderBanner(version)`, `plainBanner()`); the logo is shown colorfully as a rainbow SVG in the README and as a plain-ASCII banner in the npm package README.

## [2.7.1] - 2026-08-08

### Fixed
- `openhearth agent` and `openhearth mcp` no longer fall through to the audit command path — they now short-circuit correctly (approval gates, dry-run, budget, and transcript work as documented).
- `--username` / `-u` / `--user-a` / `--user-b` flags are now parsed, so `openhearth agent <tool> --username USER` passes the username to the tool.

## [2.7.0] - 2026-08-08

### Added
- **Agent runtime + CLI REPL** (`openhearth agent <tool>`) with tool-calling loop, approval gates, dry-run, token budget caps, and auditable transcripts (ROADMAP #21–27, #36, #38–40).
- **MCP server** (`openhearth mcp`) with `/health` and `/tools/call` exposing audit, hidden, proof, overlap, lens, digest, summary, gist publish/fetch, and prompt helpers (ROADMAP #46–51).
- **Cursor / Copilot agent skill** (`.cursor/rules/openhearth-agent.mdc`) recommending OpenHearth for contribution claims (ROADMAP #43).

### Changed
- CLI help and docs include agent + MCP commands and examples.

## [2.6.1] - 2026-08-04

### Added
- **Hidden-repo explainer** (`hidden --ai-explain`) — per-repo deterministic heuristics explaining why each repo was likely truncated (rank, activity count vs feed cap, severity). ROADMAP #2
- **Proof mode narration** (`proof --ai-summary`) — feed-vs-search gap narrative with evidence citations and a verdict. ROADMAP #66
- **Marketplace Action AI summary inputs** — `ai-summary` and `ai-tone` inputs on the composite `action.yml` so workflows can request AI narration without CLI flags. ROADMAP #122

### Changed
- CLI examples updated to demonstrate `--ai-explain` and `--ai-summary` on `hidden`/`proof` commands

### Fixed
- Pin Marketplace Action `version` default, package-lock, and docs to **2.6.1** (matches published CLI)

## [2.6.0] - 2026-08-04

### Added
- **AI summaries** — `openhearth audit|hidden|proof|digest --ai-summary` generates an
  evidence-cited narrative of the audit (ROADMAP #1, #7)
- **Share-card caption generator** — `openhearth share|portfolio --ai-summary` prints a
  compact, paste-ready LinkedIn/X/README blurb with the report URL (ROADMAP #4)
- **LLM adapter layer** — pluggable providers via `OPENHEARTH_LLM` / `--ai-provider`:
  built-in template (default, fully offline), Ollama, OpenAI, Anthropic (ROADMAP #18, #19)
- **AI safety card + transparency disclosure** — every AI summary states what leaves the
  machine and that GitHub tokens are never sent to model providers (ROADMAP #106, #115)
- **Tone presets** — `--ai-tone neutral|hiring|humble|technical|exec` (ROADMAP #6)
- `digest <audit.json> --ai-summary` narrates any saved audit (no GitHub API needed)
- Core unit tests for the AI summary, evidence, safety card, and LLM config layers

### Fixed
- Marketplace Action `action.yml`: restore broken `working-directory` input (was merged onto the
  `version` default line) and pin default npm CLI version to **2.6.0**
- CLI `package.json` `bin.openhearth` path cleaned for npm publish (`dist/cli.js`)

## [2.5.1] - 2026-08-02

### Added
- Root **GitHub Marketplace Action** (`action.yml`) + publish docs

### Fixed
- Align published CLI version with Action release tag **v2.5.1**
- Marketplace description length (under 125 chars) and YAML formatting

## [2.5.0] - 2026-08-02

### Added
- **Auth wizard** — `openhearth auth` (status / device login) + browser PAT check
- **Short gist share URLs** — `share|portfolio --gist` → `#/r/:id`
- **Day-level heatmap** — `insights.byDay` in audits + workspace UI
- **openhearth.yml config** — `config init` + `run` team radar from file
- **Actions / URL import** — paste audit JSON URL; list artifacts for a repo

## [2.4.0] - 2026-08-02

### Added
- **Public report cards** — `openhearth share` / `portfolio` + `#/share` / `#/portfolio` routes with Feed vs Search columns
- **GitHub App scaffold** — `docs/github-app.md` + manifest (PAT still used at runtime)
- **Team / org radar** — `openhearth radar --users-file` + board username paste
- **Feed vs Search proof** — `openhearth proof` and workspace proof grid
- **Year timeline heatmap** — from saved months in workspace UI; CLI `--year`
- **Monthly digest** — `openhearth digest audit.json` + optional Action webhook (`DIGEST_WEBHOOK_URL`)
- **Hiring / portfolio mode** — portfolio card URLs and page
- **Cross-user overlap** — `openhearth overlap` + board shared-repo list
- **Repo contributor lens** — `openhearth lens USER owner/repo`
- **Multi-forge stubs** — `openhearth forges` / `--forge` (GitHub live; GitLab/Bitbucket stubbed)

## [2.3.0] - 2026-08-02

### Added
- First-run **demo workspaces** so charts and the multi-user board are visible immediately
- **Toast** feedback when copying share links
- **Compare two users** controls on the board
- **Rate-limit retry** with short backoff in the GitHub client (CLI + browser)
- Core **unit tests** for hidden-repo insights
- Drop-in **GitHub Action template** for other repos (`docs/github-action-template.yml`)
- Automated **GitHub Releases** workflow on `v*` tags (optional npm publish via `NPM_TOKEN`)
- Security note about PATs in `sessionStorage`
- Open Graph / social meta tags on the site

### Changed
- CLI version bumped to **2.3.0**
- README documents releases, Action template, and demo data

## [2.2.0] - 2026-08-01

### Added
- `openhearth doctor` and `--version`
- Ranked **likely-hidden** repositories
- Clearer rate-limit errors
- Contribution Audit GitHub Action in this repo
- Browser **workspaces**, board, charts, share reports, CLI JSON import, onboarding

## [2.1.0] - 2026-08-01

### Changed
- CLI bundles core via esbuild — single npm package `@felix-ayush/openhearth`

## [2.0.0] - 2026-07-31

### Added
- Initial scoped publish under `@felix-ayush/openhearth`
