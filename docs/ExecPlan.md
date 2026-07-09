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

## Phase D: UI Implementation (FUTURE)
- [ ] Wire components to engine + `src/storage/` actions
- [ ] Implement all game flows
- [ ] Stats and sharing
- [ ] PWA manifest and service worker
