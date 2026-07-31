# OpenHearth

**CLI tool** to audit every GitHub PR, issue, and review — including repos hidden from your activity feed.

**Website** ([ayush7614.github.io/OpenHearth](https://ayush7614.github.io/OpenHearth/)) explains the product. The **npm CLI** does the work.

## Why OpenHearth?

GitHub’s profile activity truncates heavily (“51 repositories not shown”). Search shows lists; **OpenHearth audits** — with features that don’t exist elsewhere:

- **Hidden repo detection** — estimates repos your activity sidebar hides
- **Full audit** — PRs + issues + reviews in one command
- **Auto date-splitting** — past GitHub’s 1000-result search cap
- **Merge rate, busiest day, top repos**
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
```

Set `GITHUB_TOKEN` for higher rate limits.

### Commands

| Command | Description |
|---------|-------------|
| `openhearth audit <user>` | Full PR + issue + review audit |
| `openhearth hidden <user>` | Quick hidden-repo report |
| `--month YYYY-MM` | Audit a calendar month |
| `--from` / `--to` | Custom date range |
| `--kind pr\|issue\|review\|all` | Filter by type |
| `--json [file]` | Export JSON |
| `--csv [file]` | Export CSV |

## Website (docs only)

```bash
npm run dev:site    # local marketing/docs site
npm run build:site  # builds site/dist for GitHub Pages
```

## Monorepo layout

```
packages/core/   @felix-ayush/openhearth-core — internal audit engine (not published)
packages/cli/    @felix-ayush/openhearth — npm CLI (bundles core)
site/            Marketing & docs (GitHub Pages)
```

## Publish CLI to npm

```bash
npm run publish:packages
```

## Author

[Ayush Kumar](https://github.com/Ayush7614)
