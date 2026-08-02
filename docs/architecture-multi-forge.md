# Multi-forge architecture (stub)

OpenHearth 2.4 introduces a **forge adapter** interface so GitHub is not hard-wired forever.

```
CLI / site
   └─ ForgeClient.runAudit(user, kind, range)
         ├─ githubForge   → live (Search API)
         ├─ gitlabForge   → stub (throws)
         └─ bitbucketForge → stub (throws)
```

## Interface

`packages/core/src/forge.ts` defines `ForgeClient`:

- `id`, `label`, `supported`
- `runAudit(username, kind, range, onProgress?)`

GitHub’s current Search path stays in `aggregate.ts` / `github.ts` and is wrapped by `github-forge.ts`.

## CLI

```bash
openhearth forges
openhearth audit USER --forge github
openhearth audit USER --forge gitlab   # friendly error + link here
```

## Adding GitLab later

1. Implement GitLab Issues/MRs API (or GraphQL) behind `gitlabForge.runAudit`
2. Map results into `ContributionItem` / `AuditResult`
3. Reuse `buildInsights` unchanged
4. Flip `supported: true`

Same pattern for Bitbucket.
