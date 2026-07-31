# Contributing to OpenHearth

## Structure

- `packages/core` — audit engine (`@openhearth/core`)
- `packages/cli` — npm CLI (`openhearth`)
- `site` — marketing/docs website (GitHub Pages)

## Setup

```bash
npm install
npm run build
npm run dev:site          # website locally
npm run openhearth -- --help
```

## Guidelines

- Put audit logic in `@openhearth/core`; CLI is a thin terminal UI
- Keep the **website** as docs/marketing only — the tool runs via npm
- Do not commit tokens or `.env` files

## Publish CLI

After merging to main:

```bash
npm run build:cli
cd packages/cli && npm publish --access public
```
