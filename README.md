# GitBook — Contribution Audit

Complete open-source contribution audit for any GitHub user.

GitHub’s profile activity feed truncates heavily (“N repositories not shown”).
**GitBook** queries the Search API and lists **every** pull request, issue, and review in a date range — grouped by repository, with merged / open / closed counts and JSON/CSV export.

**Live:** [ayush7614.github.io/GitBook](https://ayush7614.github.io/GitBook/)

## Features

- Username + month/year lookup
- Tabs for **Pull Requests**, **Issues**, and **Reviews**
- Per-repo breakdown with expandable item lists
- Totals that match GitHub search (not the truncated activity sidebar)
- Optional personal access token (session only) for higher Search rate limits
- Automatic date-range splitting when a query exceeds the 1000-result Search cap
- Export JSON and CSV

## Development

```bash
npm install
npm run dev
```

```bash
npm run build
npm run preview
```

Production builds use `base: /GitBook/` for GitHub Pages project hosting.

## Deploy

Pushes to `main` build and publish `dist/` via [GitHub Actions](.github/workflows/deploy.yml).

In the repository settings, set **Pages** → Source to **GitHub Actions**.

## Token (optional)

Without a token, the unauthenticated Search API is limited (~10 requests/minute).
Paste a classic PAT with public read access in the UI; it is stored in `sessionStorage` and sent only to `api.github.com`.

## Author

[Ayush Kumar](https://github.com/Ayush7614)
