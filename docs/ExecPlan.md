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

## Phase D: UI Implementation (FUTURE)
- [ ] Wire components to engine
- [ ] Implement all game flows
- [ ] Stats and sharing
- [ ] PWA manifest and service worker
