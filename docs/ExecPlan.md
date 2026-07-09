# ExecPlan — Guess the Game

## Phase A: Application Shell (DONE)
- [x] Next.js App Router project initialized (15.5.20)
- [x] TypeScript strict mode configured
- [x] Tailwind CSS v4 configured
- [x] Design tokens in globals.css (from ux-design.md §13)
- [x] Global layout with Header, Footer, BottomNav
- [x] Base UI components: Button, Card, Modal, Toast, Skeleton, ErrorState
- [x] 12 shell routes created + custom not-found.tsx
- [x] Test environment (vitest + testing-library) with 35 passing tests
- [x] typecheck, lint, test, build all passing
- [x] `output: 'export'` enabled (scripts/build.mjs handles Windows phantom-file bug)
- [x] Dark mode: single dark theme via `color-scheme: dark`

## Phase B: Content System (DONE)
- [x] Zod schemas for all 4 puzzle types (keywords, emoji, screenshot, timeline)
- [x] GameEntry type with ID format validation (`^[a-z]{2}-\d{3}$`)
- [x] `schemaForMode` + `parsePuzzle` mode-dispatch (no discriminated union)
- [x] Content validation scripts (validate, assets, duplicates, check)
- [x] 8 test fixtures (2 per mode)
- [x] 25 schema unit tests
- [x] All content checks passing: 8/8 valid, 0 duplicates

## Phase C: Game Engine (REMOVED)
- Engine (normalize, match, scoring, state, reducer, adapter, search) was
  implemented and then reverted at owner request. Will be re-introduced when
  UI implementation needs it. No engine code currently in the tree.

## Phase E: Client Data Persistence (DONE)
- [x] Unified Storage Adapter — `src/storage/adapter.ts` (localStorage + memory fallback, real availability probe incl. Safari private mode)
- [x] Schema versioning — `CURRENT_SCHEMA_VERSION = 2`, single top-level key `gtg:state:v1`
- [x] Default data — `createDefaultState()` fresh V2 state
- [x] Safe read/write — SSR-safe `loadState`/`saveState`, quota guard, pruning
- [x] JSON corruption recovery — parse failure parks raw to `:corrupted` key, returns default, never overwrites original
- [x] Memory degradation when localStorage unavailable — `createMemoryAdapter()` singleton fallback
- [x] V1→V2 migration — chained pure functions (`migrate.ts`), idempotent, lossless; V2 adds `completedPuzzleIds`, `recentPuzzleIds`, `achievements`, expanded `settings`
- [x] Domain state — daily progress, completed puzzle IDs, recent puzzle IDs, stats, achievements, user settings
- [x] Idempotent duplicate-result handling — `recordModeResult` no-op on identical, upgrades on higher score, never downgrades solved→given_up
- [x] Export & reset — `exportState()` (pretty JSON), `resetState()`
- [x] 84 tests (adapter 15, migrate 14, client 23, actions 29, integration 3)

## Phase F: Technical SEO & Discovery (DONE)
- [x] Per-page unique title/description/canonical/OG via Next.js Metadata API (`src/lib/metadata.ts`, `src/lib/site-config.ts`)
- [x] `app/sitemap.ts` (9 indexable routes) + `app/robots.ts` (disallow thin pages)
- [x] WebSite + WebApplication + FAQPage JSON-LD (`src/lib/structured-data.ts`); no fake reviews/ratings
- [x] Static H1 + how-to content on every play page; game area stays the hero
- [x] `/categories` discovery page; related-mode internal links on play pages
- [x] noindex on thin pages (stats, share/[result-id], archive/[date], 404)
- [x] Canonical domain centralized via `NEXT_PUBLIC_SITE_URL`
- [x] typecheck, lint, 144 tests, static build all pass

## Phase G: Performance & Accessibility (DONE)
- [x] `prefers-reduced-motion` honored (animations / smooth-scroll disabled)
- [x] `touch-action: manipulation` + `-webkit-tap-highlight-color: transparent` on interactive elements
- [x] `overscroll-behavior: contain` on modals; `scroll-margin-top` on heading anchors
- [x] Modal marks background `inert` + supports `aria-describedby`
- [x] `GameImage` (fixed width/height, lazy/priority/decoding, error fallback) — CLS-safe
- [x] `ResultAnnouncer` (aria-live, non-color icon+text badge)
- [x] `TimelineControls` (non-drag keyboard reorder, `aria-label` position)
- [x] `LazyPlayMode` (next/dynamic code-splitting, ssr:false, skeleton)
- [x] `ShareButton` (Web Share → Clipboard → error fallback, aria-live outcome)
- [x] 203 unit + 3 e2e pass; components unit-tested in isolation

## Phase H: QA Regression Coverage (DONE)
- [x] Pure `src/lib/game/match.ts` (normalize / correct guess / duplicate / wrong-guess dedup) — 21 tests
- [x] Component tests: GameImage / ResultAnnouncer / TimelineControls / ShareButton / Modal a11y / not-found
- [x] Storage edge cases: daily date boundary, missing puzzle reference, empty bank, score floor, refresh recovery, reset
- [x] Playwright config + 3 e2e (homepage H1, keyboard nav, 404 quick links)
- [x] 203 unit + 3 e2e green; content:check + build verified

## Phase I: Security / Privacy / Copyright Review (DONE)
- [x] Read-only audit in `docs/SECURITY-REVIEW.md` (severity-graded)
- [x] H-1 (fabricated NASA attribution) — **corrected in-code this phase**: ss-001/ss-002 relabeled to `imageLicense: "placeholder"`
- [x] M-3 report inaccuracy corrected: vercel.json ships 4 security headers; real gap is CSP + X-Frame-Options only
- [x] About page copy softened to acknowledge placeholder fixtures during development
- [x] No secrets / no PII / no analytics / no fabricated ratings (verified)

## Phase J: Release Pipeline (DONE)
- [x] `.github/workflows/ci.yml` — npm ci frozen, typecheck, lint, test, content:check, build, e2e (+ caching, artifacts); branches `master`
- [x] `.github/workflows/deploy.yml` — fires only on CI success on `master`; **Cloudflare Pages** deploy via `cloudflare/pages-action` + 4-step smoke test
- [x] `public/_headers` — security headers (4) + cache rules for Cloudflare Pages (replaces former `vercel.json`)
- [x] `.env.example` — only `NEXT_PUBLIC_SITE_URL` (public, non-secret)
- [x] `docs/deployment.md` — preview/prod deploy, domain switch, cache, rollback, smoke test (Cloudflare Pages)
- [x] Failed builds block deploy; unknown branches never deploy to prod

## Phase K: Final Code Review + Acceptance (DONE)
- [x] 8-subagent read-only review → `docs/testing/final-code-review.md` (60 deduplicated findings: P0×2, P1×11, P2×47)
- [x] In-scope acceptance fixes applied this phase:
  - AGENTS.md: added 13 Agent Guardrails (enforceable, bilingual)
  - Dedup logic: extracted `src/storage/internal.ts`; removed duplicate `subtractDays` / `dedupe` / `dedupeList` from client.ts + actions.ts
  - P1-5: `scripts/lib/validators.mjs` now imports `normalizeAnswer` from `src/lib/game/match.ts` (single source of truth)
  - P1-7: KeywordsPuzzleSchema `max(8)` → `max(6)` (PRD §5.2)
  - P0-1: ss-001/ss-002 attribution relabeled to `placeholder` (false NASA claim removed)
  - P2-11: SECURITY-REVIEW M-3 corrected (vercel.json already has 4 headers)
- [x] All 6 validation commands re-run green: typecheck / lint / 203 tests / content:check / 3 e2e / build
- [x] Acceptance verdict: **PASS** (see `docs/handoff/phase-4e-4j-acceptance.md`)

## Phase D: UI Implementation (FUTURE — do not auto-advance)
- [ ] Wire components to engine + `src/storage/` actions
- [ ] Implement all game flows
- [ ] Stats and sharing
- [ ] PWA manifest and service worker

> Per AGENTS.md guardrail #13: do not auto-advance to Phase D. Owner approval required.
