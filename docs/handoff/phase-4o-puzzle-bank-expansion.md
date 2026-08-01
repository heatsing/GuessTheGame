# Handoff: Phase 4o — Puzzle bank expansion (text-based modes)

> Date: 2026-07-30 · From: Content Architect · To: Reviewer / Owner

## Scope

Expand the puzzle bank for the three text-based modes (Keywords, Emoji, Timeline) from 2 puzzles each to 12 each. This is the first step toward the "50+ puzzles per mode" target tracked in `docs/STATUS.md` → Next Actions.

| Mode | Before | After | Δ |
|------|--------|-------|---|
| Keywords | 2 (kw-001, kw-002) | 12 (kw-001..kw-012) | +10 |
| Emoji | 2 (em-001, em-002) | 12 (em-001..em-012) | +10 |
| Timeline | 2 (tl-001, tl-002) | 12 (tl-001..tl-012) | +10 |
| Screenshot | 2 (ss-001, ss-002) | 2 (unchanged) | 0 |
| **Total** | **8** | **38** | **+30** |

Screenshot mode is unchanged — it requires sourcing additional public-domain image assets (with verified per-file attribution), which is a separate task.

## What was done

### 30 new puzzle JSON files

Each file is a standalone JSON fixture under `src/data/{mode}/`, conforming to the per-mode Zod schema enforced by `scripts/lib/validators.mjs`. No code changes — pure data expansion.

**Keywords (10 new, kw-003..kw-012):** targets are Photosynthesis, Pyramid, Rainbow, Clock, Glacier, Skeleton, Lighthouse, Magnet, Telescope, Dam. Each has 4–6 keywords (PRD §5.2 minimum 4) and a non-trivial `fact`.

**Emoji (10 new, em-003..em-012):** targets are Rainbow, Pyramid, Clock, Moon, Spider, Earthquake, Telescope, Lightning, Penguin, Island. Each has 2–4 emojis and `hints: { category, firstLetter }` per the EmojiPuzzleSchema.

**Timeline (10 new, tl-003..tl-012):** each has 4 chronological `items` with `title`, `description`, and integer `date` (BCE dates use negative integers per the schema). Themes: space exploration (tl-003), ancient civilizations (tl-004), computing (tl-005), age of exploration (tl-006), natural disasters (tl-007), transportation (tl-008), communication (tl-009), landmark structures (tl-010), medicine (tl-011), energy & electricity (tl-012).

### Content integrity

All 38 puzzles pass the three-tier `content:check`:

- **Schema validation:** 38/38 passed, 0 failed. Each puzzle conforms to its per-mode Zod schema (field types, keyword/emoji/item counts, required `fact`).
- **Asset check:** 2 referenced (ss-001, ss-002 images), 0 missing, 0 oversized. Text-based modes have no image references.
- **Duplicate check:** 0 problems per the validator's current rules.
  - No duplicate IDs (global uniqueness across all modes).
  - No duplicate slugs **per mode** (slugified target). Cross-mode target overlap is allowed by design (see "Content design notes" below).
  - No alias conflicts **per mode**. Timeline is skipped (no target/aliases).

### Selection logic — no impact

The puzzle selection functions (`selectPuzzleBySeed`, `selectDailyPuzzleForMode`, `selectDailyPuzzles`, `selectAnyPuzzleBySeed` in `src/lib/game/select.ts`) are pure functions of `(seed/date, pool)`. A larger pool simply means a wider index range for the FNV-1a hash to fold into — the "same date = same puzzle for everyone" guarantee is preserved.

The selection unit tests (`src/lib/game/select.test.ts`) use isolated temp directories (`mkdtempSync` + `GTG_DATA_DIR` env hook) with a fixed 5-puzzle fixture (kw-001, kw-002, em-001, ss-001, tl-001). The new puzzle files in `src/data/` are never loaded by these tests, so the test suite remains unaffected (413/413 pass).

## Content design notes (for owner review)

During the initial expansion, two content-design issues were identified and **have been resolved** in this same phase (see "Timeline event deduplication" below). One remaining observation is flagged for the owner's discretion.

### 1. Cross-mode target overlap (Keywords ↔ Emoji) — remaining, by design

Five targets appear in **both** Keywords and Emoji modes:

| Target | Keywords ID | Emoji ID |
|--------|-------------|----------|
| Volcano | kw-001 | em-001 |
| Rainbow | kw-005 | em-003 |
| Pyramid | kw-004 | em-004 |
| Clock | kw-006 | em-005 |
| Telescope | kw-011 | em-009 |

This is explicitly allowed by the validator (`checkDuplicates` in `scripts/lib/validators.mjs` only checks slug/alias collisions **within** a mode, not across modes). The design rationale is that the two modes present the target differently (keywords vs emojis), so the same answer is not a trivial give-away.

**Operational consequence:** on the Daily Mixed Challenge page (`/daily`), the Keywords and Emoji puzzles for a given date are selected independently via `hash(date:keywords)` and `hash(date:emoji)`. With 12 puzzles each, there is a ~8.3% chance any given day picks the same target for both modes. Over a month, this is likely to happen 2–3 times. When it does, a player who solves one has effectively solved the other. The owner may consider this acceptable (the clues are still different) or may want to deduplicate cross-mode targets in a follow-up pass.

### 2. Timeline event reuse — RESOLVED

The initial batch had 6 historical events reused across multiple timeline puzzles (Printing press 1440, Moon landing 1969, ARPANET 1969, First powered flight 1903, DNA double helix 1953, Watt's steam engine 1769). This was not caught by the duplicate check because timeline puzzles have no `target`, so slug/alias checks are skipped.

**Fix applied:** replaced the duplicate events in the newer puzzles with distinct, verified alternatives (dates confirmed via web search where noted):

| Puzzle | Removed event | Replacement event | Date |
|--------|---------------|-------------------|------|
| tl-003 | First Moon landing (1969) | Voyager 1 launched | 1977 |
| tl-008 | First powered flight (1903) | First transatlantic flight (Alcock & Brown) | 1919 |
| tl-009 | Printing press invented (1440) | Paper invented in China (Cai Lun) | 105 |
| tl-009 | ARPANET created (1969) | Email invented (Ray Tomlinson) | 1971 |
| tl-011 | DNA double helix modeled (1953) | X-rays discovered (Röntgen) | 1895 |
| tl-012 | Watt's steam engine (1769) | First oil well drilled (Drake well) | 1859 |

After the fix, all 48 timeline events (12 puzzles × 4 items) have unique titles — no event appears in more than one puzzle. Each puzzle's `items` array remains in ascending chronological order. `fact` strings updated to match the new content. Original tl-001 and tl-002 were left unchanged.

## Files changed

**New (30 files):**
- `src/data/keywords/kw-003.json` through `src/data/keywords/kw-012.json`
- `src/data/emoji/em-003.json` through `src/data/emoji/em-012.json`
- `src/data/timeline/tl-003.json` through `src/data/timeline/tl-012.json`

**Modified (2 files):**
- `docs/STATUS.md` — added Phase 4o entry to the Key Decisions Log; updated Next Actions to reflect partial completion of the content expansion target.
- `docs/handoff/phase-4o-puzzle-bank-expansion.md` — this handoff document.

## Verification

All validation gates green:

| Gate | Result |
|------|--------|
| `npm run content:check` | 38/38 schema passed, 0 asset problems, 0 duplicate problems |
| `npm run typecheck` | clean (tsc --noEmit, exit 0) |
| `npm run lint` | clean (0 ESLint warnings/errors) |
| `npm test` | 413/413 tests pass (30 test files) |
| `npm run build` | compiles successfully, 20/20 static pages generated. Static export hits the known Windows NTFS phantom-file bug on `_not-found` chunk copy (antivirus lock) — CI/Linux builds are unaffected, as documented in project memory. |

## Guardrails compliance

| # | Rule | Compliance |
|---|------|-----------|
| 1 | Do not develop the entire website in one shot | This is a pure data slice — no code, no UI, no architecture change |
| 2 | Do not upgrade major frameworks | No framework changes |
| 3 | Do not add dependencies casually | No new deps — JSON files only |
| 4 | Do not copy the same logic into every mode | No logic added; existing validators reused |
| 5 | Do not use `any` to paper over TypeScript cracks | No TypeScript changes |
| 6 | Do not delete failing tests to get a green CI | All 413 tests pass without deletion |
| 7 | Do not fabricate APIs or databases | All puzzles are real static JSON |
| 8 | Do not fabricate site-wide user data | No user/player data added |
| 9 | Do not scatter localStorage calls | No storage changes |
| 10 | Do not generate thin SEO pages for every puzzle | No new routes — puzzles are fetched at runtime via selection functions |
| 11 | Do not let multiple agents modify the same file simultaneously | Single-agent sequential edit |
| 12 | Do not skip role handoff documents | This document |
| 13 | Do not automatically advance to the next phase | Awaiting owner review |

## Next actions for the owner

1. Review the 30 new puzzles for content quality, factual accuracy, and difficulty calibration.
2. Decide whether the cross-mode target overlap (§1) is acceptable for launch, or request a follow-up content pass to deduplicate Keywords ↔ Emoji targets.
3. Decide whether to proceed with Screenshot mode expansion (requires sourcing additional public-domain image assets with verified attribution — the same workflow used for P0-1 on 2026-07-26).
4. Decide whether to continue toward the 50+ per-mode target, or accept the current 12/12/12/2 distribution as sufficient for launch.
