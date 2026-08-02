# GitHub App scaffold (v1)

OpenHearth still authenticates with a **PAT** or Actions `GITHUB_TOKEN` today. This document is the scaffold for a future GitHub App so orgs can install OpenHearth without pasting tokens into the browser.

## Why an App?

- No `sessionStorage` PAT for browser audits
- Org-level install + least privilege
- Higher, clearer rate limits for Search

## Suggested permissions

| Permission | Access | Why |
| --- | --- | --- |
| Metadata | Read | Basic repo/user metadata |
| Issues | Read | Search-backed issue/PR inventory |
| Pull requests | Read | PR + review inventory |

No Contents write. No administration.

## Manifest

See [`github-app-manifest.yml`](./github-app-manifest.yml). Create an App from it:

1. GitHub → Settings → Developer settings → GitHub Apps → **New GitHub App**
2. Or use the manifest flow: https://docs.github.com/en/apps/sharing-github-apps/registering-a-github-app-from-a-manifest
3. Install on the accounts you want to audit
4. Generate a private key; store as `OPENHEARTH_APP_ID` + `OPENHEARTH_APP_PRIVATE_KEY` (future CLI)

## Status in 2.4.0

- Manifest + this doc ship now
- CLI/browser still use `GITHUB_TOKEN` / `--token`
- OAuth device flow / App installation tokens are **not** wired yet

Track progress in Discussions or Issues when you enable them.
