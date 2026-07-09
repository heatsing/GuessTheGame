# Deployment

A repeatable, verifiable, rollback-able release pipeline for the static,
no-backend **Guess the Game** site. The pipeline guarantees that a failing
typecheck / lint / test / content-validation / build **blocks** production
deployment — there is no manual override path around the gate.

---

## 1. Architecture at a glance

- **Static export** — Next.js `output: 'export'` produces `out/` (HTML/CSS/JS + JSON). No server runtime, no database, no login.
- **Host** — Vercel (static hosting). No application server is added.
- **CI** — GitHub Actions runs the quality gate on every PR and every push to `main`.
- **Production deploy** — A second workflow (`deploy.yml`) fires **only after CI succeeds on `main`**, deploys the prebuilt `out/` to Vercel, then runs a smoke test.
- **Preview deploys** — Vercel's native GitHub integration creates a preview deployment for every PR automatically; the CI gate is a required check before merge.

```
PR opened ──► Vercel preview deploy (automatic)
          ──► GitHub Actions CI (typecheck · lint · test · content · build · e2e)
          ──► (merge blocked until CI is green)

push main ──► CI runs ──► (on CI success) deploy.yml ──► Vercel prod ──► smoke test
```

---

## 2. Install — frozen, reproducible

The project standardizes on **npm + `package-lock.json`**. CI uses `npm ci`,
which installs exactly the lockfile and fails if it is out of sync with
`package.json` — the npm equivalent of `pnpm install --frozen-lockfile`.

> Why not pnpm? The repository already ships `package-lock.json` and all local
> scripts use `npm`. `npm ci` provides the same reproducibility guarantee
> without churning the toolchain. If you prefer pnpm, delete
> `package-lock.json`, add `pnpm-lock.yaml`, and swap `npm ci`→`pnpm install
> --frozen-lockfile` in both workflow files — the gate semantics are identical.

---

## 3. The quality gate (`.github/workflows/ci.yml`)

Runs on: `push` to `main`, `pull_request` to `main`.

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
and **`head_branch == 'main'`**. This is the single enforcer of "main-only,
gate-passed production deploys" — unknown branches and failing builds never
reach this job.

Steps:
1. Checkout at the exact commit CI verified (`head_sha`).
2. `npm ci` + install Vercel CLI.
3. `vercel pull --environment=production` — pulls build env from Vercel.
4. `vercel build --prod` — builds using Vercel's build step (uses `vercel.json`).
5. `vercel deploy --prebuilt --prod` — deploys the prebuilt output.
6. **Smoke test** (see §7).

### Required GitHub secrets / variables

Configure in **Settings → Secrets and variables → Actions**:

| Name | Kind | Purpose |
|------|------|---------|
| `VERCEL_TOKEN` | Secret | Vercel CLI auth (create at vercel.com → Account → Tokens) |
| `VERCEL_ORG_ID` | Secret | Vercel org/team ID |
| `VERCEL_PROJECT_ID` | Secret | Vercel project ID |
| `NEXT_PUBLIC_SITE_URL` | Variable | Production canonical URL (e.g. `https://guess-the-game.app`) |

> Org/Project IDs are also written to `.vercel/project.json` locally by
> `vercel link`; they are non-secret but stored as secrets here so the
> workflow is self-contained. The `VERCEL_TOKEN` is **always** a secret and is
> never committed, logged, or echoed.

---

## 5. Preview deployment

Every pull request gets an automatic Vercel preview deployment via Vercel's
native GitHub integration (no extra workflow needed). The preview URL follows
`https://guess-the-game-git-<branch>-<org>.vercel.app` (or a generated slug).

- Preview builds inherit the project's env vars; `NEXT_PUBLIC_SITE_URL` should
  be left as the placeholder or set per-preview so canonical/OG URLs do not
  point preview traffic at production.
- The CI workflow is a **required status check** before merge to `main`
  (configure in GitHub → Branches → Branch protection rules).

---

## 6. Environment variables & domain switch

Template: [`.env.example`](../.env.example). Only public, non-secret values
are committed.

| Variable | Where | Example |
|----------|-------|---------|
| `NEXT_PUBLIC_SITE_URL` | Vercel project env (Production) + GitHub var | `https://guess-the-game.app` |
| `VERCEL_TOKEN` | GitHub Secret | (never committed) |
| `VERCEL_ORG_ID` | GitHub Secret | (never committed) |
| `VERCEL_PROJECT_ID` | GitHub Secret | (never committed) |

### Switching the production domain

1. **Add the domain** in Vercel → Project → Settings → Domains. Verify DNS.
2. **Set `NEXT_PUBLIC_SITE_URL`** to the new domain in:
   - Vercel → Project → Settings → Environment Variables (Production), **and**
   - GitHub → Settings → Secrets and variables → Actions → Variables.
3. Push to `main` (or re-run the deploy workflow). The next deploy rebuilds
   canonical URLs, OG tags, sitemap, and robots.txt with the new domain.
4. Confirm the smoke test passes on the new URL.

`SITE_CONFIG.url` is read in **one place** (`src/lib/site-config.ts`); no
hardcoded domain exists elsewhere in the app.

---

## 7. Post-release smoke test

`deploy.yml` runs an automated smoke test against the deployed URL immediately
after deploy:

1. Homepage returns HTTP 200 **and** contains an `<h1>`.
2. `/sitemap.xml` returns 200.
3. `/robots.txt` returns 200.
4. `/play/keywords/` returns 200.

A failed smoke test marks the deploy job as failed, signalling a bad release
to roll back (the deployment itself still went out — see §8 for rollback).

---

## 8. Rollback

Vercel keeps every production deployment; rollback is instant and does not
require a rebuild.

### Via Vercel dashboard (fastest)
1. Vercel → Project → Deployments.
2. Find the last known-good production deployment.
3. ⋮ menu → **Promote to Production**.

### Via Vercel CLI
```bash
# List recent production deployments
vercel ls --prod

# Promote a previous deployment to production
vercel promote <deployment-url> --prod
```

### Via git (code-level rollback)
```bash
git revert <bad-commit>      # or: git reset --hard <good-commit> && git push -f
```
Pushing the revert to `main` re-runs CI and (on success) deploys a fresh
production build — use this when the bad change is in code, not just a config
glitch.

> **Never** force-push to `main` as a first resort — prefer `git revert` so
> history is preserved and the rollback itself is auditable.

---

## 9. Cache strategy

Configured in [`vercel.json`](../vercel.json):

| Asset path | Cache-Control | Rationale |
|------------|---------------|-----------|
| `/_next/static/*` | `public, max-age=31536000, immutable` | Content-hashed; safe to cache forever |
| `/images/*` | `public, max-age=31536000, immutable` | Puzzle images are immutable per build |
| Everything else (HTML, JSON routes) | `public, max-age=0, must-revalidate` | Revalidated so new deploys are seen immediately |

Security headers are also set in `vercel.json`: `X-Content-Type-Options`,
`Referrer-Policy`, `Permissions-Policy` (disables camera/mic/geo/FLoC), and
`Strict-Transport-Security`.

---

## 10. What this pipeline will NOT do

- ❌ **No secrets in config** — tokens live in GitHub Secrets / Vercel env.
- ❌ **No bypassing failed tests** — `workflow_run` only fires on `success`.
- ❌ **No auto-deploy of unknown branches** — `head_branch == 'main'` guard.
- ❌ **No extra servers** — static export on Vercel's edge only.

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

All green locally → push → CI runs the same gates → deploy on `main`.
