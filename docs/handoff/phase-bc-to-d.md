# Handoff: Phase B → Phase D (UI Engineer)

> Date: 2026-07-09 · From: Content Architect · To: UI Engineer

## Phase B: Content System

### Delivered
- `src/lib/content/schemas.ts` — Zod schemas: GameEntry, Keywords, Emoji, Screenshot, Timeline; `schemaForMode` + `parsePuzzle` mode-dispatch helpers; `type Puzzle` (TS union, no Zod union)
- `src/lib/content/loader.ts` — loadPuzzleById, loadPuzzlesByMode, loadAllPuzzles, getPuzzleIndex (uses `parsePuzzle`)
- `src/data/` — 8 test fixtures (2 per mode: kw-001/002, em-001/002, ss-001/002, tl-001/002)
- `scripts/validate-content.mjs` — schema validation (8/8 pass)
- `scripts/check-assets.mjs` — image path verification
- `scripts/check-duplicates.mjs` — ID/slug/alias conflict detection
- `scripts/check-content.mjs` — combined check
- `src/lib/content/schemas.test.ts` — 25 unit tests

### Key design decisions
- **No discriminated union** — the former `PuzzleSchema = z.discriminatedUnion(...)` was removed. Each puzzle is validated against its own concrete schema via `schemaForMode(mode)` / `parsePuzzle(json)`. This keeps the validation path explicit.
- `type Puzzle` remains a TS-level union (`KeywordsPuzzle | EmojiPuzzle | …`) for return types, but there is no runtime Zod union.
- Timeline uses `.omit({ target, aliases })` on GameEntrySchema — no target for timeline puzzles
- ID format: `^[a-z]{2}-\d{3}$` (kw-001, em-001, ss-001, tl-001)
- Alias conflict check is per-mode (Volcano in keywords + emoji is allowed)
- `.mjs` scripts import `.ts` schemas directly via Node `--experimental-strip-types`

### Placeholder assets
- `public/images/puzzles/ss-001.webp` and `ss-002.webp` are PLACEHOLDER images (generated, not real content). Replace with curated IP-safe WebP during content curation.

## Phase C: Game Engine — REMOVED

The game engine (normalize, match, scoring, state machine, reducer, adapters, search) was previously implemented under `src/lib/engine/` and has been **removed at owner request**. It will be re-introduced when UI implementation requires it.

When re-implementing, refer to `docs/PRD.md` §7 (scoring) and `docs/architecture.md` (engine/UI separation) for the rules it must encode.

## Verification (all green)

| Gate | Result |
|------|--------|
| `npm run typecheck` | clean |
| `npm run lint` | 0 errors, 0 warnings |
| `npm run test` | 60 tests, 7 files, all pass |
| `npm run build` | 15 static pages (export wrapper handles Windows phantom-file bug) |
| `npm run content:check` | 8/8 valid, 0 missing assets, 0 duplicates |

## For Phase D (UI Engineer)

### What to build next
- Implement game engine (pure functions) per PRD §7 — answer matching, scoring, state machine. Place under `src/lib/engine/`.
- Wire UI components to the engine once it exists
- Create game-specific components: PuzzleInput, GuessList, RevealButton, BlurImage, TimelineList
- Implement Daily Challenge grid (4 puzzle cards)
- Implement Stats page (read from localStorage)
- Implement Share flow (text card + clipboard)
- Add localStorage persistence layer (`src/lib/storage/`)
- Add daily schedule lookup

### Architecture constraints
- UI components must NOT contain game rules — import from `src/lib/engine/`
- localStorage access must be in `src/lib/storage/`, never in engine or components
- All game state changes go through the reducer — no direct state mutation
- Content validation uses `parsePuzzle` (mode-dispatched), not a union schema
