# Changelog

All notable changes to OpenHearth are documented here.

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
