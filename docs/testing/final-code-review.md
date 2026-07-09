# Final Code Review — Guess the Game

**Date:** 2026-07-09
**Mode:** Read-only review (no business logic modified)
**Scope:** `master` branch, recent phases 4e–4j (storage, SEO, perf/a11y, QA, security review, CI)
**Reviewers:** 8 independent subagents — Correctness, Security & Privacy, Game Rules, Test Coverage, Performance, Accessibility, SEO, Maintainability

Each finding cites `file:line` evidence. Findings are deduplicated across reviewers. Priority levels:

- **P0 — Blocks production deployment.** Must fix before the site goes live publicly.
- **P1 — Blocks Phase 4d wiring / game going live.** Must fix when wiring game UI, before any mode is playable.
- **P2 — Non-blocking improvements.** Address opportunistically.

> Note: Several "not yet implemented" items (game loop, scoring engine, daily schedule) are **expected** gaps because the game engine was reverted in Phase 4c and UI is Phase 4d (pending). They are listed for completeness under P1, not treated as regressions.

---

## P0 — Blocks production deployment

### P0-1. Fabricated image attribution on screenshot placeholders
- **Sources:** Security (H-1), independently re-verified by reading the image bytes.
- **Location:** `src/data/screenshot/ss-001.json:8-9`, `src/data/screenshot/ss-002.json:8-9`; assets `public/images/puzzles/ss-001.webp`, `public/images/puzzles/ss-002.webp`.
- **Evidence:** Both fixtures declare `"imageLicense": "public-domain"` + `"imageAttribution": "NASA, via Wikimedia Commons"` (ss-001) / `"NASA Earth Observatory"` (ss-002). The actual `.webp` files are ~9 KB **generated placeholders** (solid background + text `PLACEHOLDER / ss-001 Mount Everest / Replace with curated IP-safe WebP`). The Zod schema (`ScreenshotPuzzleSchema`) enforces presence of these fields but never their truth.
- **Impact:** The metadata asserts a real-world source/license the project does not hold. Contradicts `src/app/about/page.tsx` ("Screenshot mode uses public-domain images (such as from Wikimedia Commons and NASA)… Each image carries attribution metadata"). Misrepresents ownership; violates AGENTS.md "IP-safe content only".
- **Fix:** Before screenshot mode is exposed publicly: (a) replace placeholders with verified public-domain images and set real per-file attribution/license/source URL, **or** (b) relabel as `"imageLicense": "placeholder"`, `"imageAttribution": "Generated placeholder — not a licensed asset"`. Add a content-validation rule in `scripts/lib/validators.mjs` rejecting real-source names (NASA/Wikimedia/USGS) on placeholder-flagged assets.

### P0-2. OG image `/og.png` does not exist — 404 on every social share
- **Source:** SEO (B1).
- **Location:** `src/lib/site-config.ts:39` (`ogImage: "/og.png"`); consumed by `src/app/layout.tsx:42`, `src/app/page.tsx:20`, `src/lib/metadata.ts:52,61`.
- **Evidence:** `public/` contains only `images/puzzles/ss-001.webp`, `ss-002.webp`, `.gitkeep` — no `og.png`. Every page's OG/Twitter image points at a 404.
- **Impact:** Facebook/Twitter/LinkedIn/Slack share cards render with no image. Significant distribution/CTR loss on any deployed page.
- **Fix:** Create `public/og.png` (1200×630 recommended) before deployment, or point `SITE_CONFIG.ogImage` at an existing asset.

---

## P1 — Blocks Phase 4d wiring / game going live

### P1-1. `saveState` writes to disk with no schema validation — one bad field loses all user data on next load
- **Source:** Correctness (blocking).
- **Location:** `src/storage/client.ts:233-234` (write), `src/storage/migrate.ts:106-108` (load fast-path).
- **Evidence:** `saveState` does `JSON.stringify(working)` directly; `actions.ts:207` constructs `wrongGuesses` via `dedupeList` (no empty-string filter, no normalization). On load, `migrate` runs `V2Schema.safeParse(raw)` and on **any** field failure returns `createDefaultState()` — discarding the entire state. `types.ts:47` requires `wrongGuesses: z.array(z.string().min(1))`, `score: 0-100`, `daily` keys matching `^\d{4}-\d{2}-\d{2}$`.
- **Impact:** Any caller passing an out-of-range value (score >100 from a scoring bug, a non-zero-padded date like `2026-7-9`, a negative `revealedClues`, an empty-string wrong guess) is written to disk; the next `loadState()` then drops **all** progress (streak, stats, achievements, completions) and shows defaults. Failure is disproportionate to the cause. Contradicts `migrate.ts:45` comment "lossless by default".
- **Fix:** Validate with `V2Schema.safeParse(working)` before writing; reject with `{ok:false, error:"invalid"}` on failure. Defensive-normalize `score`/`date`/`revealedClues`/`wrongGuesses` at the `actions.ts` entry. Long-term: make `migrate` recover partially (drop bad entries, keep the rest) instead of discarding the whole state.

### P1-2. Modal `inert` only covers direct siblings — header/nav/footer remain reachable by screen readers
- **Sources:** Correctness (blocking), Accessibility (B2).
- **Location:** `src/components/ui/Modal.tsx:62-73`.
- **Evidence:** No `createPortal`; `<Modal>` renders inline, so `overlay.parentElement` is its immediate page div, not `document.body`. Only that div's siblings get `inert`. In `src/app/layout.tsx:87-96`, `<SiteHeader>`/`<SiteFooter>`/`<BottomNav>`/skip-link are siblings of `<main>`, not of the modal's parent — so they stay focusable and announceable. `aria-modal="true"` is unreliable across NVDA/JAWS/VoiceOver; `inert` is the reliable mechanism. The Tab-trap (lines 42-56) only catches Tab, not SR browse-mode navigation.
- **Test blind spot:** `Modal.a11y.test.tsx:8-16` places the background button in the **same parent div** as the Modal, so it gets inerted — giving false confidence.
- **Fix:** Render the overlay via `createPortal(..., document.body)` so `overlay.parentElement === document.body` and all body children are inerted; or iterate `document.body.children` instead of `overlay.parentElement.children`.

### P1-3. Modal has no accessible name when `title` is omitted; title `id` is hardcoded → collisions
- **Source:** Accessibility (B3, B4).
- **Location:** `src/components/ui/Modal.tsx:93,117,133`.
- **Evidence:** `titleId = labelledBy ?? "modal-title"`; `aria-labelledby={title ? titleId : undefined}` (no `aria-label` fallback). The `<h2 id="modal-title">` uses a hardcoded string — two Modals on one page, or a collision with an existing `id="modal-title"`, breaks `aria-labelledby` resolution.
- **Impact:** WCAG 4.1.2 (Name, Role, Value) violation when no title; WCAG 4.1.1 (parsing/id) risk on multi-instance.
- **Fix:** Require `title` or `labelledBy`; generate the id with `useId()`.

### P1-4. `ToastProvider` is never mounted — `useToast()` throws on first call
- **Source:** Maintainability (B1).
- **Location:** `src/components/ui/Toast.tsx:19-23` (throws if no provider); `src/app/layout.tsx:74-99` (no `<ToastProvider>`). Grep: `useToast` appears only in `Toast.test.tsx`.
- **Impact:** Phase 4d's first use of the public `useToast` API white-screens the page. Latent landmine.
- **Fix:** Mount `<ToastProvider>` in `layout.tsx`, or remove `useToast`/`ToastProvider` exports if Toast won't be used in 4d.

### P1-5. `normalizeAnswer` has two divergent implementations — content validation misses duplicates
- **Source:** Maintainability (B2).
- **Location:** `src/lib/game/match.ts:19-24` (folds internal whitespace) vs `scripts/lib/validators.mjs:16-18` (does **not** fold whitespace).
- **Evidence:** `checkDuplicates` (validators.mjs:136-140) uses the weak version. Two aliases differing only in internal whitespace (`"Mount  Everest"` vs `"Mount Everest"`) are treated as equal by the game matcher but distinct by the validator → a duplicate slips through to production, causing one guess to match two puzzles.
- **Impact:** Violates ADR-002 "single source of truth"; correctness risk in content gating.
- **Fix:** Have `validators.mjs` import `normalizeAnswer` from `match.ts` (the script already imports `schemas.ts` via `--experimental-strip-types`); delete the second copy.

### P1-6. `recordModeResult` allows `given_up → solved` overwrite, violating "give-up locks the result"
- **Source:** Game Rules (B2).
- **Location:** `src/storage/actions.ts:213-237`.
- **Evidence:** The non-downgrade guard (L223) only blocks `solved→given_up`; `existing given_up + new solved` falls into the "otherwise" branch (L236) and overwrites. PRD §5.1: "Once a puzzle is answered (correctly or via give-up), the result is locked."
- **Fix:** Treat `given_up` as terminal for the daily path (do not upgrade to `solved`); or introduce a `lockOnGiveUp` semantic rather than relying on UI.

### P1-7. Keywords schema allows 8 keywords; PRD mandates 6
- **Source:** Game Rules (B1).
- **Location:** `src/lib/content/schemas.ts:65` — `keywords: z.array(z.string().min(1)).min(4).max(8)`.
- **Evidence:** PRD §5.2 "6 associated keywords"; AC-12 "Reveal keyword button … cannot exceed 6"; AC-13 scoring assumes ≤6. Current fixtures (kw-001/002) have 6, so latent — but the gate lets 7-8 through.
- **Fix:** `.max(6)` (or `.length(6)` if "6" is hard).

### P1-8. `migrate.ts` uses unsafe `as PersistedState["…"]` assertions on V1 data
- **Source:** Maintainability (B3).
- **Location:** `src/storage/migrate.ts:42-48`.
- **Evidence:** `v1["daily"]` (actually `unknown`) is asserted directly to V2's `Record<string, DailyProgress>`, skipping structural validation.
- **Impact:** Runtime-safe today because the final `V2Schema.safeParse` (migrate.ts:135) catches malformations — but the intermediate object is a type-level "lie". A future early-return or a V3 migration reusing it could bypass the final check.
- **Fix:** Keep data `unknown` through the migration chain; rely solely on the final `safeParse` for type narrowing. Or define a `V1Schema` and `safeParse` before asserting.

### P1-9. Game components are implemented and unit-tested but wired into zero pages
- **Sources:** Performance (B1/B4), Accessibility (B1), Test Coverage (B1), Maintainability (N13).
- **Location:** `src/app/play/{keywords,emoji,screenshot,timeline}/page.tsx:68-77` (all render `<p>The X game board will appear here.</p>`). Grep: `ResultAnnouncer|TimelineControls|GameImage|ShareButton|lazyPlayMode` appear only in their own `.test.tsx`.
- **Impact:** All performance/a11y/game-rule goals that depend on these components are **unverified in production surface**. This is expected for Phase 4d-pending, but means: code-splitting (`LazyPlayMode`), image CLS protection (`GameImage`), SR result announcement (`ResultAnnouncer`), non-drag timeline, share fallback — none are actually delivered yet.
- **Fix:** When wiring Phase 4d, mount these components on the corresponding play pages (via `lazyPlayMode`), and run end-to-end keyboard + SR verification.

### P1-10. No next-clue preload mechanism; no real image-compression strategy
- **Source:** Performance (B2, B3).
- **Location:** Grep `preload|prefetch|new Image()` → 0 hits in `src/`. `public/images/puzzles/ss-001.webp` is a placeholder; `next.config.mjs:15` `images.unoptimized: true` (static export forces this); no `blurSrc`/thumbnail field in the puzzle schema.
- **Impact:** Two stated performance goals ("next clue preloadable on demand", "first clue image reasonably compressed") are unmet. Must be built during/after Phase 4d.
- **Fix:** After revealing a clue, preload the next image (`new Image().src = nextUrl` or `<link rel="preload" as="image">`). Produce multi-tier images per clue (blur placeholder ~1-3 KB + main webp ≤ ~70 KB) and add a `blurSrc` field to the schema, consumed by `GameImage`.

### P1-11. `loader.ts` has zero tests
- **Source:** Test Coverage (B3).
- **Location:** `src/lib/content/loader.ts` exports `loadPuzzleById`/`loadPuzzlesByMode`/`loadAllPuzzles`/`getPuzzleIndex`; no `loader.test.ts` exists.
- **Evidence:** `readPuzzleFile` (loader.ts:32-50) returns `null` + `console.error` on parse/schema failure; `loadPuzzleById` falls back to a full scan for unknown prefixes (loader.ts:70-76); `loadPuzzlesByMode` returns `[]` for missing dirs (loader.ts:82). These paths feed archive/[date], sitemap, structured-data — the runtime landing points for "empty bank / missing puzzle reference".
- **Fix:** Add `loader.test.ts`: unknown ID → `null`; malformed JSON → `null` (no throw); empty dir → `[]`; unknown-prefix scan hits.

---

## P2 — Non-blocking improvements

### Correctness / Storage

- **P2-1.** `saveState` quota failure is silent; `actions` ignores the return value and reports `changed:true` with an in-memory state that differs from disk. `client.ts:214-230`, `actions.ts:318`. Propagate the error; also prune `daily` (60d) on quota, not just `last30Days`.
- **P2-2.** Pruning is off-by-one: `retentionDays=60` keeps 61 days (`date >= today-60`); `last30Days` keeps 31. `client.ts:67-80,86-99`. Use strict `>` or `retentionDays-1`.
- **P2-3.** Forward-compat hole: `migrate` returns default for `version > CURRENT`, but the next `saveState` overwrites the on-disk higher-version data with defaults. `migrate.ts:100-103`, `client.ts:189-197`. Add a read-only/foreign-version flag that blocks `saveState`.
- **P2-4.** `dedupeList` (actions.ts:56-66) dedupes by raw string, unlike `match.wrongGuessesOnly` which normalizes. Case variants (`"Everest"`/`"everest"`) store as two entries. Normalize in `recordModeResult`.
- **P2-5.** `updateSettings` compares fields manually (actions.ts:430-433) — a new `SettingsState` field won't be detected as changed. Use `JSON.stringify` comparison.
- **P2-6.** `estimateSize()` semantics differ: with-arg = `stringify(state).length`; no-arg = `raw.length` of on-disk string. `client.ts:262-269`. Unify.
- **P2-7.** `:corrupted` stash is overwritten on each corruption (loses prior copy); `resetState` (client.ts:247-255) doesn't remove `:corrupted`. Use a timestamped key; clear `:corrupted` on successful `saveState` and in `resetState`.
- **P2-8.** `Modal` `onClose` is in the effect dep array (Modal.tsx:89) — an unstable inline callback re-runs the effect (inert toggle + focus jump). Hold `onClose` in a ref; depend on `[open]` only.
- **P2-9.** `Modal` with no focusable children returns early on Tab (Modal.tsx:46) — Tab escapes. Give the dialog `tabIndex={-1}` and focus it, or `preventDefault` on Tab when empty.
- **P2-10.** `GameImage.onError` calls `setState`/callback after unmount (GameImage.tsx:91-94). Harmless in React 18+ but add a `mounted` ref if parent relies on `onError`.

### Security & Privacy

- **P2-11.** **SECURITY-REVIEW.md M-3 is inaccurate.** It claims "no security headers configured", but `vercel.json:8-17` already sets `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy` (incl. `interest-cohort=()`), and HSTS preload. The real remaining gap is only **no CSP** and **no `X-Frame-Options`/`frame-ancestors`** (clickjacking). Correct the report; downgrade M-3 to Low. Note: inline JSON-LD `<script>` works under `script-src 'self'`.
- **P2-12.** `.gitignore` covers `.env*.local` but **not bare `.env`/`.env.production`**. Add `.env`/`.env.*` with `!.env.example`.
- **P2-13.** `serializeJsonLd` (structured-data.ts:101-103) doesn't escape `<`/`</script>`/U+2028/U+2029. Currently unexploitable (all data hardcoded) but the function's "safe serialization" comment is false. Add `.replace(/</g, "\\u003c")`.
- **P2-14.** No Privacy or Contact page. Add `/privacy` (localStorage data, retention windows, export/reset, no accounts/analytics) and `/contact` (or GitHub Issues) for copyright takedown — link from footer.
- **P2-15.** Static answer exposure is undisclosed. Answers live in client JSON bundles (View Source/DevTools). Add a one-line honesty note to `/how-to-play` or About (honor-system, like all browser puzzle games).
- **P2-16.** No dependency-vulnerability scan in CI. Add `npm audit --omit=dev --audit-level=high` (block on high/critical) or Dependabot.
- **P2-17.** `share/[result-id]` echoes unvalidated `resultId` (page.tsx:48). React-escapes (no XSS) and only `placeholder` is prerendered in export, but validate against a strict regex for defense-in-depth.
- **P2-18.** JSON-LD `offers.price` is a string `"0"` (structured-data.ts:47). Use number `0` or `"0.00"`.

### Game Rules (semantics to align when wiring)

- **P2-19.** `recalcStreak` (actions.ts:456-496) has no "daily challenge completed" guard — PRD §7.3 counts streak only on Daily Challenge completion. Enforce `isDaily` at the call site or in storage.
- **P2-20.** `revealedClues` comment (types.ts:39-42) says "for emoji: shown emoji count", contradicting PRD §5.3 (emojis shown all at once; hints are category/firstLetter). Fix the comment; clarify per-mode semantics or split the field.
- **P2-21.** `bestDailyScore`/`last30Days` store raw day-total (0-400), not the multiplier-applied final score (PRD §7.2/§7.4). Reconcile when the streak multiplier lands.
- **P2-22.** `completeDailyChallenge` (actions.ts:327-350) doesn't verify all 4 modes are resolved (PRD §5.1). Add the assertion.
- **P2-23.** Unlimited same-day play overwrites the date+mode slot → `gamesPlayed`/`modeBreakdown`/`modeAvgScore` undercount (PRD §7.4 "total puzzles"). Introduce a separate history array for unlimited, or document that unlimited doesn't count toward stats.
- **P2-24.** Achievement system isn't in PRD (4 IDs defined, only manual `unlockAchievement`). Either add to PRD with trigger rules, or mark as experimental scaffolding.
- **P2-25.** Duplicate-guess deduplication (match.ts:69-84) is a reasonable decision PRD doesn't specify. Record it in `DECISIONS.md`.

### Test Coverage

- **P2-26.** `modeAvgScore` incremental recalculation (actions.ts:248-279) has **zero** value assertions — only `score`/`changed` are checked. Add: first record → avg === score; second record → correct mean; negative input → clamped to 0.
- **P2-27.** `saveState` `error:'unavailable'` branch (client.ts:192) untested. Inject `isAvailable:()=>false`.
- **P2-28.** Soft-quota "trim succeeds" path (client.ts:214-231) untested — only "still over after trim" is. Add a just-over-threshold case that trims to ok.
- **P2-29.** `estimateSize` third case (client.test.ts:266-276) is a weak `> 0` assertion with an unused `raw` var. Assert exact equality to `JSON.stringify(loadState()).length`.
- **P2-30.** Real `localStorage` ↔ `loadState`/`saveState`/`migrate` chain is never run end-to-end (all tests use the memory adapter). Add one case writing V1 JSON via `createLocalStorageAdapter()` then `loadState()`.
- **P2-31.** `completeDailyChallenge` cross-minute re-stamp (actions.ts:339-340) untested. Use `vi.setSystemTime`.
- **P2-32.** CI build (`scripts/build.mjs`) silently falls back to non-export on the Windows phantom-file bug. Add a CI step asserting `out/` and `out/index.html` exist (Linux CI doesn't trigger the fallback).
- **P2-33.** e2e covers only homepage H1, keyboard-to-keywords, 404. Add: each play page H1, BottomNav hrefs, stats page noindex shell.

### Performance

- **P2-34.** `SiteHeader`/`BottomNav` are `"use client"` (usePathname) loaded on every page (layout.tsx:91,96). Small, but the only global client hydration. Acceptable; could move active-state to server + data attributes.
- **P2-35.** `loader.ts` (node:fs) is build-time-only and currently has **no importers** — dead code. Add `import "server-only"` as a guard for when it's wired.
- **P2-36.** `--font-heading`/`--font-body` name 'Inter' (globals.css:51-53) but no font file/`@font-face`/Google link exists — falls back to `system-ui` (good for perf, but the token is misleading). Either ship Inter via `next/font/google`, or rename the token to reflect system fonts.
- **P2-37.** sitemap `lastModified` uses build-time `new Date()` for all entries (sitemap.ts:21). Use fixed/content-based dates for static pages.

### Accessibility

- **P2-38.** `ResultAnnouncer` uses `aria-live="assertive"` (ResultAnnouncer.tsx:34) — game results aren't urgent and will interrupt AT users. Downgrade to `polite`.
- **P2-39.** `TimelineControls` `<li tabIndex={0}>` contains two buttons → 3 Tab stops per item; comment says "listbox" but it's a `role="list"`. Use roving tabindex; fix the comment.
- **P2-40.** Global `:focus-visible` (globals.css:166-170) sets `border-radius`, changing rounded corners on any focused element. Remove `border-radius` from the focus rule.
- **P2-41.** `body` lacks `overscroll-behavior` (globals.css:130-138) — mobile pull-to-refresh/overscroll remains. Add `overscroll-behavior: none` to html/body.
- **P2-42.** Modal focus-trap selector (Modal.tsx:43-45,75-77) omits `[contenteditable]`, `<audio controls>`, etc., and doesn't filter `disabled`. Use `:not([disabled]):not([inert])` and add contenteditable.
- **P2-43.** No visible close button in Modal (only overlay-click + Escape). Provide a standard close control.

### SEO

- **P2-44.** Root `layout.tsx:63` canonical is `SITE_CONFIG.url` (no trailing slash) — inconsistent with `trailingSlash:true`. Use `canonicalUrl("/")`. (Currently no page uses this fallback, but it's a latent inconsistency.)
- **P2-45.** `share/[result-id]` canonical → `/share/` (no index page exists); `not-found` canonical → `/404/` (fictional route). Both are `noindex` so low impact; point canonical at `/` instead.
- **P2-46.** `breadcrumbSchema` (structured-data.ts:81-94) is dead code. Either wire BreadcrumbList JSON-LD into play/how-to-play/archive/categories/about, or remove it.
- **P2-47.** OG image has no `width`/`height` (metadata.ts:50-55, layout.tsx:40-45). Add `width:1200, height:630`.
- **P2-48.** Play-page OG/Twitter `title` is just the mode name (e.g. "Keywords"), unlike the `<title>` which is "Keywords | Guess the Game". Unify OG title to include the site name.
- **P2-49.** Homepage "About" intro is folded inside `<details>` (page.tsx:126-167). Crawlablе but consider surfacing the first paragraph for relevance signal.

### Maintainability

- **P2-50.** Dead exports: `MODE_TO_PREFIX` (schemas.ts:195-200), `MODE_KEYS` (types.ts:81,178), `modeInfo` (site-config.ts:159-161), `breadcrumbSchema` (structured-data.ts:81-94). Remove or mark "reserved".
- **P2-51.** `ResultAnnouncer.regionRef` (ResultAnnouncer.tsx:27) is never read. Delete it + the `useRef` import.
- **P2-52.** `subtractDays` duplicated in actions.ts:86-97 and client.ts:47-58; `dedupe`/`dedupeList` duplicated in client.ts:104-114 and actions.ts:56-66. Extract to an internal `storage/internal/` module.
- **P2-53.** Test helpers (`todayUtc`/`daysAgo`/`makeV1Fixture`) duplicated across 4 test files. Extract to `src/storage/__testutils__/helpers.ts`.
- **P2-54.** ADR-002 (DECISIONS.md:95-105) claims `src/engine/`/`src/data/`/`src/ui/` dirs + `eslint-plugin-import` + `no-restricted-imports`, but actual dirs are `src/lib/game`/`src/lib/content`/`src/storage`/`src/components`/`src/app` and `eslint.config.mjs` has no import-boundary rules. Update the ADR to match reality, or rename dirs + add the ESLint rules.
- **P2-55.** ADR-004/006/007 (DECISIONS.md:202,304-308,354) reference non-existent files/deps (`data/daily-schedule.json`, `scripts/gen-schedule.ts`, `fuse.js`, `data/search-index.json`, `scripts/process-images.ts`). Mark each "Implementation: pending (Phase 4d+)".
- **P2-56.** Magic numbers scattered: `Modal.tsx:124,126` (480px/90vh), `LazyPlayMode.tsx:31` (240px), `Toast.tsx:33` (4000ms), `TimelineControls.tsx:128,134-138` (44px/24px), `ErrorState.tsx:33,36`. Centralize as design tokens/constants.
- **P2-57.** `zIndex: "var(--z-modal)" as string` workaround repeated in 4 files (Modal.tsx:104, SiteHeader.tsx:23, BottomNav.tsx:25, Toast.tsx:49). Extract a `cssVar()` helper or a `Z_INDEX` const.
- **P2-58.** BottomNav labels `/archive` as "More" (BottomNav.tsx:6-11) while SiteHeader labels it "Archive" (SiteHeader.tsx:6-12). Unify the label/aria-label.
- **P2-59.** AGENTS.md "Commit Conventions" lists only `docs:`/`feat:`/`fix:` but the repo uses `chore`/`refactor`/`revert`/`perf`/`test:`/`ci:` (all valid Conventional Commits). Update AGENTS.md to enumerate or reference Conventional Commits.
- **P2-60.** AGENTS.md doesn't list `ExecPlan.md`/`SECURITY-REVIEW.md`/`deployment.md` in document locations. Add them for a single source of truth.

---

## Cross-cutting summary

**What's solid (evidence-backed, not "looks fine"):**
- Storage layer design: unified adapter (localStorage + memory fallback, Safari-private-mode probe), SSR safety, schema versioning, idempotent domain actions, corruption recovery — covered by 84 tests with precise assertions (no `.only`/empty `it`/`expect(true)`).
- CSS/a11y foundations: `prefers-reduced-motion` honored, `touch-action: manipulation`, 44px touch targets, skip link, `scroll-margin-top`, no `outline:none`, no `transition: all`, animations on transform/opacity only.
- SEO architecture: centralized domain config, per-page unique title/description (all ≤60/≤155), correct noindex/sitemap/robots three-layer coordination, JSON-LD with no fake reviews/ratings, internal-link coverage, no keyword stuffing.
- CI/deploy: `npm ci` frozen install, full gate (typecheck/lint/test/content/build/e2e), deploy fires only on CI-success-on-main, 4-step smoke test, no secrets in config.
- No secrets in repo; no PII in localStorage; no analytics/ads; no fabricated player data/leaderboards.

**The two real deployment blockers (P0):** fabricated image attribution and the missing OG image. Both are content/asset gaps, not architecture flaws.

**The dominant P1 theme:** the storage layer and game/a11y components are well-built and well-tested in isolation, but have latent defects (no write-time validation, Modal inert scope, ToastProvider unmounted, divergent `normalizeAnswer`, give-up-not-locked, keywords max 8) that will surface the moment Phase 4d wires them together. Fix these **before** wiring, not after.

---

## Recommended fix order

1. **P0-1, P0-2** — before any public deployment.
2. **P1-1, P1-2, P1-3, P1-4** — before any Modal/Toast is used in game UI.
3. **P1-5, P1-6, P1-7, P1-8** — before content/scoring/state is exercised by real play.
4. **P1-9, P1-10, P1-11** — as part of Phase 4d wiring.
5. **P2-11** (correct the inaccurate SECURITY-REVIEW M-3) — doc accuracy, do immediately.
6. Remaining P2 items — opportunistically.

This review is read-only; no business implementation was modified.
