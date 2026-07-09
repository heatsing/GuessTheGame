# Deployment

A repeatable, verifiable, rollback-able release pipeline for the static,
no-backend **Guess the Game** site. The pipeline guarantees that a failing
typecheck / lint / test / content-validation / build **blocks** production
deployment — there is no manual override path around the gate.

**Host: Cloudflare Pages** (static hosting of the `out/` export directory).

---

## 1. Architecture at a glance

- **Static export** — Next.js `output: 'export'` produces `out/` (HTML/CSS/JS + JSON). No server runtime, no database, no login.
- **Host** — Cloudflare Pages (static hosting). No application server is added.
- **CI** — GitHub Actions runs the quality gate on every PR and every push to `master` (the repo default branch).
- **Production deploy** — A second workflow (`deploy.yml`) fires **only after CI succeeds on `master`**, builds `out/`, publishes it to Cloudflare Pages via `cloudflare/pages-action`, then runs a smoke test.
- **Headers & caching** — `public/_headers` (copied into `out/_headers` by the export) configures security headers + cache rules at Cloudflare's edge.

```
PR opened ──► GitHub Actions CI (typecheck · lint · test · content · build · e2e)
          ──► (merge blocked until CI is green)

push master ──► CI runs ──► (on CI success) deploy.yml ──► Cloudflare Pages prod ──► smoke test
```

---

## 2. Install — frozen, reproducible

The project standardizes on **npm + `package-lock.json`**. CI uses `npm ci`,
which installs exactly the lockfile and fails if it is out of sync with
`package.json` — the npm equivalent of `pnpm install --frozen-lockfile`.

---

## 3. The quality gate (`.github/workflows/ci.yml`)

Runs on: `push` to `master`, `pull_request` to `master`.

| Step | Command | Purpose |
|------|---------|---------|
| Install | `npm ci` | Frozen lockfile install |
| Typecheck | `npm run typecheck` | `tsc --noEmit`, strict mode |
| Lint | `npm run lint` | ESLint (Next config) |
| Unit tests | `npm run test` | Vitest, all suites |
| Content validation | `npm run content:check` | Schema + asset + duplicate checks |
| Build | `npm run build` | Static export → `out/` |
| E2E | `npm run test:e2e` | Playwright (chromium), separate job |

- **Caching**: `actions/setup-node` with `cache: npm` caches `~/.npm`.
- **Artifacts**: `out/` and `playwright-report/` are uploaded for 7 days.
- **Concurrency**: superseded PR runs are cancelled to save minutes.

> **Linux CI is unaffected** by the Windows NTFS phantom-file bug handled by
> `scripts/build.mjs` — the first `next build` with `output: 'export'`
> succeeds and produces `out/`.

---

## 4. Production deployment (`.github/workflows/deploy.yml`)

Triggered by `workflow_run` on `CI` **completed with `conclusion == 'success'`**
and **`head_branch == 'master'`**. This is the single enforcer of
"master-only, gate-passed production deploys" — unknown branches and failing
builds never reach this job.

Steps:
1. Checkout at the exact commit CI verified (`head_sha`).
2. `npm ci`.
3. `npm run build` — static export → `out/` (with `NEXT_PUBLIC_SITE_URL`).
4. `cloudflare/pages-action@v1` publishes `out/` to the `guess-the-game`
   Cloudflare Pages project (production branch = `master`).
5. **Smoke test** against the deployment URL (see §7).

### Required GitHub secrets / variables

Configure in **Settings → Secrets and variables → Actions**:

| Name | Kind | Purpose |
|------|------|---------|
| `CLOUDFLARE_API_TOKEN` | Secret | Cloudflare API token with "Cloudflare Pages — Edit" permission (create at dash.cloudflare.com → My Profile → API Tokens) |
| `CLOUDFLARE_ACCOUNT_ID` | Secret | Cloudflare account ID (dash → any domain → Overview → right sidebar) |
| `NEXT_PUBLIC_SITE_URL` | Variable | Production canonical URL (e.g. `https://guess-the-game.pages.dev` or a custom domain) |

> The `CLOUDFLARE_API_TOKEN` is **always** a secret and is never committed,
> logged, or echoed. The `CLOUDFLARE_ACCOUNT_ID` is not inherently secret but
> is stored as a secret so the workflow is self-contained.

### One-time Cloudflare Pages project setup

1. Create a Pages project named `guess-the-game` at
   dash.cloudflare.com → Workers & Pages → Create → Pages → Upload assets
   (or connect the GitHub repo directly if you prefer Cloudflare's native
   Git integration — see §5).
2. Note the account ID and create the API token.
3. Add the secrets/variable above to GitHub.

---

## 5. Preview deployment

Two options, pick one:

**Option A — GitHub Actions only (current setup).** The `deploy.yml` workflow
runs only on `master` (production). For previews, rely on the CI artifact
(`out/` is uploaded for 7 days) and local `npm run build` + `npx serve out`.

**Option B — Cloudflare Pages Git integration.** Connect the GitHub repo to
the Cloudflare Pages project in the dashboard. Cloudflare will create a
preview deployment for every PR automatically, with a
`https://<commit>.guess-the-game.pages.dev` URL. If you enable this, you can
optionally remove `deploy.yml` and let Cloudflare build on push — but you
lose the "CI must pass before deploy" gate unless you configure Cloudflare's
deployment branching rules to require the CI check.

---

## 6. Environment variables & domain switch

Template: [`.env.example`](../.env.example). Only public, non-secret values
are committed.

| Variable | Where | Example |
|----------|-------|---------|
| `NEXT_PUBLIC_SITE_URL` | GitHub Variable (Actions) + Cloudflare Pages env (if using Git integration) | `https://guess-the-game.pages.dev` |
| `CLOUDFLARE_API_TOKEN` | GitHub Secret | (never committed) |
| `CLOUDFLARE_ACCOUNT_ID` | GitHub Secret | (never committed) |

### Switching the production domain

1. **Add the domain** in Cloudflare Pages → Project → Custom domains. Verify
   DNS (add a CNAME to `<project>.pages.dev` or an Apex alias).
2. **Set `NEXT_PUBLIC_SITE_URL`** to the new domain in:
   - GitHub → Settings → Secrets and variables → Actions → Variables, **and**
   - Cloudflare Pages → Project → Settings → Environment variables (Production)
     if using Git integration.
3. Push to `master` (or re-run the deploy workflow). The next deploy
   rebuilds canonical URLs, OG tags, sitemap, and robots.txt with the new
   domain.
4. Confirm the smoke test passes on the new URL.

`SITE_CONFIG.url` is read in **one place** (`src/lib/site-config.ts`); no
hardcoded domain exists elsewhere in the app.

---

## 7. Post-release smoke test

`deploy.yml` runs an automated smoke test against the Cloudflare Pages
deployment URL immediately after publish:

1. Homepage returns HTTP 200 **and** contains an `<h1>`.
2. `/sitemap.xml` returns 200.
3. `/robots.txt` returns 200.
4. `/play/keywords/` returns 200.

A failed smoke test marks the deploy job as failed, signalling a bad release
to roll back (the deployment itself still went out — see §8 for rollback).

---

## 8. Rollback

Cloudflare Pages keeps every production deployment; rollback is instant and
does not require a rebuild.

### Via Cloudflare dashboard (fastest)
1. Cloudflare Pages → Project → Deployments.
2. Find the last known-good production deployment.
3. ⋮ menu → **Rollback to this deployment**.

> Cloudflare Pages allows rolling back to any previous production deployment.
> Preview deployments are not affected.

### Via git (code-level rollback)
```bash
git revert <bad-commit>      # or: git reset --hard <good-commit> && git push -f
```
Pushing the revert to `master` re-runs CI and (on success) deploys a fresh
production build — use this when the bad change is in code, not just a config
glitch.

> **Never** force-push to `master` as a first resort — prefer `git revert` so
> history is preserved and the rollback itself is auditable.

---

## 9. Cache strategy & security headers

Configured in [`public/_headers`](../public/_headers) (copied to `out/_headers`
by the static export, read by Cloudflare Pages at serve time):

| Asset path | Cache-Control | Rationale |
|------------|---------------|-----------|
| `/_next/static/*` | `public, max-age=31536000, immutable` | Content-hashed; safe to cache forever |
| `/images/*` | `public, max-age=31536000, immutable` | Puzzle images are immutable per build |
| Everything else (HTML, JSON routes) | `public, max-age=0, must-revalidate` | Revalidated so new deploys are seen immediately |

Security headers (applied to every route via `/*`):
`X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`,
`Permissions-Policy` (disables camera/mic/geo/FLoC), and
`Strict-Transport-Security` (HSTS preload).

> **Note:** CSP and `X-Frame-Options`/`frame-ancestors` are not yet configured
> (see `docs/SECURITY-REVIEW.md` M-3). Add them to `_headers` before the public
> launch.

---

## 10. What this pipeline will NOT do

- ❌ **No secrets in config** — tokens live in GitHub Secrets.
- ❌ **No bypassing failed tests** — `workflow_run` only fires on `success`.
- ❌ **No auto-deploy of unknown branches** — `head_branch == 'master'` guard.
- ❌ **No extra servers** — static export on Cloudflare's edge only.

---

## 11. Local verification before pushing

```bash
npm ci
npm run typecheck
npm run lint
npm run test
npm run content:check
npm run build          # produces out/ on Linux/macOS
npm run test:e2e       # needs `npx playwright install` first
```

All green locally → push → CI runs the same gates → deploy on `master`.
