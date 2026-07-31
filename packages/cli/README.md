# OpenHearth

**Find every GitHub contribution your profile activity feed hides.**

OpenHearth is a CLI that audits pull requests, issues, and reviews via the GitHub Search API — then reports what GitHub’s truncated activity sidebar doesn’t show (“51 repositories not shown”).

Built for heavy open-source contributors in the AI era, when monthly PR counts can hit hundreds across dozens of repos.

## The problem

GitHub’s profile **Contribution activity** is not a complete ledger:

- Repos are grouped and truncated (“**N repositories not shown**”)
- The green graph counts commits, not PRs across repos
- Search shows lists; it doesn’t audit or compare against the feed

OpenHearth gives you the **full inventory** — grouped by repo, with merged / open / closed counts and export.

## Install

```bash
npx @felix-ayush/openhearth audit USERNAME --month 2026-07
```

Or install globally:

```bash
npm install -g @felix-ayush/openhearth
openhearth audit USERNAME --month 2026-07
```

**Requires Node.js 20+**

## Quick start

```bash
# Full audit — PRs + issues + reviews
openhearth audit Ayush7614 --month 2026-07

# Quick report: repos likely hidden from your activity sidebar
openhearth hidden Ayush7614 --month 2026-07

# Export for spreadsheets or dashboards
openhearth audit Ayush7614 --month 2026-07 --json report.json
openhearth audit Ayush7614 --month 2026-07 --csv report.csv
```

## Commands

| Command | Description |
|---------|-------------|
| `openhearth audit <user>` | Full PR + issue + review audit (default) |
| `openhearth hidden <user>` | Hidden-repo report vs activity sidebar |
| `--month YYYY-MM` | Audit a calendar month |
| `--from YYYY-MM-DD` | Custom range start |
| `--to YYYY-MM-DD` | Custom range end |
| `--kind pr\|issue\|review\|all` | Filter by contribution type |
| `--token TOKEN` | GitHub PAT (or use `GITHUB_TOKEN` env) |
| `--json [file]` | Export JSON (`stdout` if no file) |
| `--csv [file]` | Export CSV |
| `--quiet` | Minimal terminal output |

## What makes OpenHearth different

- **Hidden repo detection** — estimates repos your profile sidebar truncates (~25 visible before “not shown”)
- **Full Search API pagination** — fetches all results, not just the first page
- **Auto date-splitting** — when a month exceeds GitHub’s 1000-result search cap, splits the range automatically
- **One-command full audit** — PRs, issues, and reviews together
- **Insights** — merge rate, busiest day, top repositories
- **Export** — JSON and CSV for your own tooling

## Authentication (recommended)

Without a token, the unauthenticated Search API is limited (~10 requests/minute).

```bash
export GITHUB_TOKEN=ghp_your_token_here
openhearth audit USERNAME --month 2026-07
```

A classic PAT with **public read** access is enough. The token is sent only to `api.github.com`.

## Example output

```
  OpenHearth · contribution audit

  Summary · @Ayush7614 · 2026-07

  Total contributions   412
  Unique repositories   76
  PR merge rate         84%
  By kind               PRs 394 · Issues 12 · Reviews 6

  ⚠ Hidden by activity feed
  Feed shows ~25 repos; Search API found 76.
  ~51 repositories may not appear on your profile sidebar.

  Top repositories
  · KovaMD/Kova 38
  · repowise-dev/repowise 33
  ...
```

## Links

- **Website & docs:** [ayush7614.github.io/OpenHearth](https://ayush7614.github.io/OpenHearth/)
- **Source:** [github.com/Ayush7614/OpenHearth](https://github.com/Ayush7614/OpenHearth)
- **Issues:** [github.com/Ayush7614/OpenHearth/issues](https://github.com/Ayush7614/OpenHearth/issues)

## Author

**Ayush Kumar** — [@Ayush7614](https://github.com/Ayush7614)

## License

MIT
