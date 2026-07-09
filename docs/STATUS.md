# Project Status — Guess the Game

## Current Phase

**Phase 1–3: Product & Design Definition** — COMPLETE

## Phase Tracker

| Phase | Role | Deliverable | Status | Commit |
|-------|------|-------------|--------|--------|
| 1 | PM | PRD + game rules + acceptance criteria | done | docs: define product requirements and game rules |
| 2 | Architect | Static architecture + DECISIONS | done | docs: define static application architecture |
| 3 | UX Designer | Sitemap + user flows + component states | done | docs: define user experience and interface system |
| 4a | Engineer | Application shell | done | chore: initialize static application shell |
| 4b | Content Architect | Puzzle content system | done | feat: add validated static puzzle content system |
| 4c | Engine Engineer | Game engine | removed | reverted — engine deferred |
| 4d | Engineer | UI implementation | pending | — |
| 4e | Storage Engineer | Client data persistence | done | feat: add versioned local progress and statistics |
| 4f | SEO Engineer | Technical SEO & discovery | done | feat: add technical seo and static discovery pages |

## Key Decisions Log

- 2026-07-09: Product pivoted from old "GuessVerse" (Semantic Guess + geography games) to "Guess the Game" (5-mode guessing platform). Local codebase deleted; GitHub repo reset to empty.
- 2026-07-09: Confirmed static-only architecture — no database, no login, no runtime backend.
- 2026-07-09: PRD complete — 5 game modes (Daily Mixed Challenge, Keywords, Emoji, Screenshot, Timeline), 45 acceptance criteria, 22 user stories.
- 2026-07-09: Architecture complete — Next.js App Router static export, 8 ADRs, engine/UI separation, localStorage data layer with schema migration.
- 2026-07-09: UX design complete — 12-page sitemap, full user flows, design tokens, 30+ component inventory, accessibility spec.
- 2026-07-09: Infrastructure shell complete — Next.js 15.5.20, `output: 'export'` enabled, build wrapper handles Windows Defender phantom-file bug, dark theme via `color-scheme: dark`.
- 2026-07-09: Game engine (Phase 4c) reverted/removed at owner request. Content system simplified — removed `PuzzleSchema` discriminated union in favor of per-mode `schemaForMode`/`parsePuzzle` dispatch. Engine will be re-introduced when needed for UI implementation.
- 2026-07-09: Client data persistence (Phase 4e) complete — `src/storage/` module with unified Storage Adapter (localStorage + memory fallback), schema versioning (`CURRENT_SCHEMA_VERSION = 2`), V1→V2 chained migration, JSON corruption recovery (corrupt data parked to `:corrupted` key, never overwritten), SSR-safe reads/writes, capacity pruning (daily 60d / last30 30d / recent 20), idempotent domain actions (`recordModeResult` no-op on duplicates, no score downgrade), export/reset, 84 unit + integration tests.
- 2026-07-09: Technical SEO (Phase 4f) complete — per-page unique title/description/canonical/OG via Next.js Metadata API, `app/sitemap.ts` + `app/robots.ts`, WebSite/WebApplication/FAQPage JSON-LD (no fake reviews), static H1 + how-to content on every play page, `/categories` discovery page, related-mode internal links, noindex on thin pages (stats, share, archive/[date], 404), canonical domain centralized in `src/lib/site-config.ts` via `NEXT_PUBLIC_SITE_URL`. 144 tests pass, static build verified.

## Deliverables

| Document | Path | Description |
|----------|------|-------------|
| PRD | `docs/PRD.md` | Product requirements, game rules, scoring, acceptance criteria |
| Architecture | `docs/architecture.md` | Static app architecture, 14 topics with alternatives |
| ADRs | `docs/DECISIONS.md` | 8 architecture decision records |
| UX Design | `docs/ux-design.md` | Sitemap, flows, design tokens, component inventory |
| Handoff 1→2/3 | `docs/handoff/phase-1-to-2-3.md` | PM to Architect/UX handoff |
| Handoff 2→4 | `docs/handoff/phase-2-to-4.md` | Architect to Engineer handoff |
| Handoff 3→4 | `docs/handoff/phase-3-to-4.md` | UX to Engineer handoff |

## Blockers

None.

## Next Actions

1. Phase 4d: Engineer implements UI — wire React components to the `src/storage/` actions API and game logic
2. Re-introduce game engine (pure scoring/match/streak functions) when UI needs it
3. Build UI components per UX spec
4. Create content (50+ puzzles per mode)
