# GitHub App & auth (2.5)

OpenHearth supports three auth paths:

## A. Fine-grained PAT (default)

```bash
export GITHUB_TOKEN=github_pat_…
openhearth doctor
openhearth auth status
```

Browser: Workspaces → **Auth wizard** (sessionStorage only).

Add **gist** permission if you use `openhearth share USER --gist`.

## B. OAuth device flow

1. Create a GitHub **OAuth App** (callback can be `http://localhost`)
2. `export OPENHEARTH_CLIENT_ID=…`
3. `openhearth auth login` — enter the user code in the browser
4. Export the printed `GITHUB_TOKEN` for the shell

## C. GitHub App install token

Use [`github-app-manifest.yml`](./github-app-manifest.yml) to register an App, install it, then mint an installation access token and:

```bash
export GITHUB_TOKEN=<installation_token>
```

Full App OAuth proxy for the static Pages site is still out of scope — device flow + PAT cover CLI and browser without a backend.

## Related

- Short share links: `openhearth share USER --month YYYY-MM --gist` → `#/r/:gistId`
- Config: `openhearth config init` → `openhearth run`
