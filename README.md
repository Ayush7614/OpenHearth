# OpenHearth

**CLI tool** to audit every GitHub PR, issue, and review — including repos hidden from your activity feed.

**Website** ([ayush7614.github.io/OpenHearth](https://ayush7614.github.io/OpenHearth/)) has **docs + browser workspaces**. The **npm CLI** does the same audit in your terminal.

## Why OpenHearth?

GitHub’s profile activity truncates heavily (“51 repositories not shown”). Search shows lists; **OpenHearth audits** — with features that don’t exist elsewhere:

- **Browser workspaces** — create a space per user, run audits, track months locally
- **Ranked hidden repos** — lower-activity repos past the ~25 sidebar cap
- **Full audit** — PRs + issues + reviews in one command
- **Doctor + rate-limit UX** — clear fix hints when GitHub throttles you
- **GitHub Action** — monthly/on-demand audits with JSON/CSV artifacts
- **Auto date-splitting** — past GitHub’s 1000-result search cap
- **JSON / CSV export**

## Install & run (CLI)

```bash
# From this repo (development)
npm install
npm run build:cli
npm run openhearth -- audit Ayush7614 --month 2026-07

# After npm publish
npx @felix-ayush/openhearth audit Ayush7614 --month 2026-07
npx @felix-ayush/openhearth hidden Ayush7614 --month 2026-07
npx @felix-ayush/openhearth doctor
```

Set `GITHUB_TOKEN` for higher rate limits.

### Commands

| Command | Description |
|---------|-------------|
| `openhearth audit <user>` | Full PR + issue + review audit |
| `openhearth hidden <user>` | Ranked likely-hidden repos |
| `openhearth doctor` | Auth + rate-limit check |
| `--month YYYY-MM` | Audit a calendar month |
| `--from` / `--to` | Custom date range |
| `--kind pr\|issue\|review\|all` | Filter by type |
| `--json [file]` | Export JSON |
| `--csv [file]` | Export CSV |
| `-V, --version` | Print CLI version |

### GitHub Action

`.github/workflows/audit.yml` runs audits on demand or monthly and uploads JSON/CSV artifacts.

## Website (docs only)

```bash
npm run dev:site    # local marketing/docs site
npm run build:site  # builds site/dist for GitHub Pages
```

## Monorepo layout

```
packages/core/   Internal audit engine (bundled into the CLI — not published)
packages/cli/    @felix-ayush/openhearth — the only npm package users should install
site/            Marketing & docs (GitHub Pages)
```

> Note: an early `@felix-ayush/openhearth-core` publish was removed from npm.
> Install `@felix-ayush/openhearth` only.

## Publish CLI to npm

```bash
npm run publish:packages
```

## Author

[Ayush Kumar](https://github.com/Ayush7614)
