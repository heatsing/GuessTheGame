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

## Phase B: Content System (IN PROGRESS)
- [ ] Zod schemas for all 5 puzzle types
- [ ] GameEntry type
- [ ] Content validation scripts (validate, assets, duplicates, check)
- [ ] Test fixtures (2-3 per mode)
- [ ] Unit tests for schemas

## Phase C: Game Engine (PENDING)
- [ ] Answer normalization
- [ ] Match logic (aliases, case-insensitive)
- [ ] Search index and suggestions
- [ ] GameState / GameAction / Reducer
- [ ] Score calculation (all modes)
- [ ] Win/loss conditions
- [ ] Mode adapter interface
- [ ] Serializable state
- [ ] Comprehensive unit tests

## Phase D: UI Implementation (FUTURE)
- [ ] Wire components to engine
- [ ] Implement all game flows
- [ ] Stats and sharing
- [ ] PWA manifest and service worker
