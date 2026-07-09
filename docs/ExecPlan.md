# ExecPlan — Guess the Game

## Phase A: Application Shell (DONE)
- [x] Next.js App Router project initialized
- [x] TypeScript strict mode configured
- [x] Tailwind CSS v4 configured
- [x] Design tokens in globals.css (from ux-design.md §13)
- [x] Global layout with Header, Footer, BottomNav
- [x] Base UI components: Button, Card, Modal, Toast, Skeleton, ErrorState
- [x] 12 shell routes created
- [x] Test environment (vitest + testing-library) with 35 passing tests
- [x] typecheck, lint, test, build all passing
- [x] Note: `output: 'export'` temporarily disabled (Windows _not-found bug)

## Phase B: Content System (DONE)
- [x] Zod schemas for all 5 puzzle types (keywords, emoji, screenshot, timeline + discriminated union)
- [x] GameEntry type with ID format validation (`^[a-z]{2}-\d{3}$`)
- [x] Content validation scripts (validate, assets, duplicates, check)
- [x] 8 test fixtures (2 per mode)
- [x] 22 schema unit tests
- [x] All content checks passing: 8/8 valid, 0 duplicates

## Phase C: Game Engine (DONE)
- [x] Answer normalization (case, punctuation, whitespace, articles)
- [x] Match logic (aliases, case-insensitive, roman numerals, common aliases)
- [x] Search index and prefix-based suggestions
- [x] GameState discriminated union (4 mode-specific states)
- [x] GameAction union + pure gameReducer
- [x] Score calculation (all 4 modes + daily total + streak multiplier + final score)
- [x] Position error calculation for Timeline
- [x] Mode adapter interface (createInitialState, canSubmit, getProgress, serialize/deserialize)
- [x] Serializable game state (JSON round-trip)
- [x] 87 engine unit tests (normalize 7, match 9, scoring 30, reducer 22, adapter 12, search 7)
- [x] Duplicate guess blocking, ended-game guard, empty answer guard

## Phase D: UI Implementation (FUTURE)
- [ ] Wire components to engine
- [ ] Implement all game flows
- [ ] Stats and sharing
- [ ] PWA manifest and service worker
