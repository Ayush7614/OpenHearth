# Publishing OpenHearth on GitHub Marketplace

The banner **“Use this GitHub action with your project → View on Marketplace”** appears after you publish a reusable Action from a public repo that has `action.yml` at the **repository root**.

OpenHearth includes [`action.yml`](../action.yml) (composite action wrapping the npm CLI).

## Requirements (GitHub)

1. Public repository  
2. Root `action.yml` / `action.yaml`  
3. Unique `name` (not another Marketplace action, not another user/org name you don’t own)  
4. You accepted the **GitHub Marketplace Developer Agreement**  
5. Account has **2FA** enabled  

Docs: https://docs.github.com/en/actions/how-tos/create-and-publish-actions/publish-in-github-marketplace

## Publish steps (you do this in the UI)

1. Merge `action.yml` to `main`  
2. Open https://github.com/Ayush7614/OpenHearth/blob/main/action.yml  
3. Click the banner **Draft a release** (or Releases → Draft)  
4. Check **Publish this Action to the GitHub Marketplace**  
5. Pick category (e.g. *Utilities* or *Reporting*) + icon/color (already in `action.yml`)  
6. Tag a release (e.g. `v2.8.2`) and publish  

After that, the repo shows **View on Marketplace**, and others can use:

```yaml
- uses: Ayush7614/OpenHearth@v2.8.2
  with:
    username: Ayush7614
    month: "2026-07"
    github-token: ${{ secrets.GITHUB_TOKEN }}
```

## Notes

- Marketplace lists the **Action**, not the workflow template in `docs/github-action-template.yml`.  
- Pin the Action input `version` to an npm release (default `2.8.2`).  
- GitHub recommends a dedicated action-only repo for the cleanest Marketplace page; a monorepo still works if root `action.yml` exists.  
- Optional later: split `Ayush7614/openhearth-action` if you want a minimal Marketplace listing separate from the product monorepo.
