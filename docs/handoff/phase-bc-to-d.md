# Handoff: Phase B & C → Phase D (UI Engineer)

> Date: 2026-07-09 · From: Content Architect + Engine Engineer · To: UI Engineer

## Phase B: Content System

### Delivered
- `src/lib/content/schemas.ts` — Zod schemas: GameEntry, Keywords, Emoji, Screenshot, Timeline, discriminated PuzzleSchema
- `src/lib/content/loader.ts` — loadPuzzleById, loadPuzzlesByMode, loadAllPuzzles, getPuzzleIndex
- `src/data/` — 8 test fixtures (2 per mode: kw-001/002, em-001/002, ss-001/002, tl-001/002)
- `scripts/validate-content.mjs` — schema validation (8/8 pass)
- `scripts/check-assets.mjs` — image path verification
- `scripts/check-duplicates.mjs` — ID/slug/alias conflict detection
- `scripts/check-content.mjs` — combined check
- `src/lib/content/schemas.test.ts` — 22 unit tests

### Key design decisions
- Timeline uses `.omit({ target, aliases })` on GameEntrySchema — no target for timeline puzzles
- ID format: `^[a-z]{2}-\d{3}$` (kw-001, em-001, ss-001, tl-001)
- Alias conflict check is per-mode (Volcano in keywords + emoji is allowed)
- `.mjs` scripts import `.ts` schemas directly via Node `--experimental-strip-types`

### Known issue
- `npm run content:assets` reports ss-001.webp and ss-002.webp missing — expected, public images not yet sourced

## Phase C: Game Engine

### Delivered
- `src/lib/engine/normalize.ts` — normalizeAnswer (case, punctuation, whitespace, articles)
- `src/lib/engine/match.ts` — matchGuess (aliases, roman numerals, common alias table)
- `src/lib/engine/scoring.ts` — all scoring functions per PRD §7
- `src/lib/engine/state.ts` — GameState discriminated union + GameAction union
- `src/lib/engine/reducer.ts` — pure gameReducer handling all actions
- `src/lib/engine/adapter.ts` — ModeAdapter interface + 4 mode adapters + getAdapter
- `src/lib/engine/search.ts` — buildSearchIndex + searchSuggestions (prefix-based)
- 6 test files — 87 engine unit tests total

### Key design decisions
- Engine is 100% pure — no React, no DOM, no localStorage
- Discriminated union on `mode` field enables type-safe state narrowing
- Reducer guards: duplicate guess blocked, ended game ignored, empty guess ignored
- Roman numeral conversion (II↔2) and common aliases (USA↔United States) in match.ts
- Adapters provide serialize/deserialize for localStorage persistence (future)

### Test coverage
- Punctuation, case, whitespace normalization
- Roman numeral and common alias matching
- Empty answer, duplicate answer, ended-game resubmit
- Score boundaries (0, 10 floor, 100 max)
- Streak multiplier boundaries (2→3, 4→5, 6→7, 9→10)
- Position error calculation (correct, swapped, reversed)
- State serialization round-trip

## Verification (all green)

| Gate | Result |
|------|--------|
| `npm run typecheck` | clean |
| `npm run lint` | 0 errors, 0 warnings |
| `npm run test` | 144 tests, 13 files, all pass |
| `npm run build` | 15 static pages generated |
| `npm run content:validate` | 8/8 valid |
| `npm run content:duplicates` | 0 conflicts |

## For Phase D (UI Engineer)

### What to build next
- Wire UI components to engine: use `gameReducer` + mode adapters in React components
- Create game-specific components: PuzzleInput, GuessList, RevealButton, BlurImage, TimelineList
- Implement Daily Challenge grid (4 puzzle cards)
- Implement Stats page (read from localStorage)
- Implement Share flow (text card + clipboard)
- Add localStorage persistence layer (`src/lib/storage/`) using adapter serialize/deserialize
- Add daily schedule lookup (`src/lib/engine/schedule.ts` — not yet implemented)

### Architecture constraints
- UI components must NOT contain game rules — import from `src/lib/engine/`
- localStorage access must be in `src/lib/storage/`, never in engine or components
- All game state changes go through `gameReducer` — no direct state mutation
