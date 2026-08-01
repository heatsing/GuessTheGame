# Handoff: Phase 4o — Puzzle bank expansion

> Date: 2026-07-30 (updated 2026-08-01) · From: Content Architect · To: Reviewer / Owner

## Scope

Expand the puzzle bank for all four modes from 2 puzzles each to 12 each. This is the first step toward the "50+ puzzles per mode" target tracked in `docs/STATUS.md` → Next Actions.

| Mode | Before | After | Δ |
|------|--------|-------|---|
| Keywords | 2 (kw-001, kw-002) | 12 (kw-001..kw-012) | +10 |
| Emoji | 2 (em-001, em-002) | 12 (em-001..em-012) | +10 |
| Timeline | 2 (tl-001, tl-002) | 12 (tl-001..tl-012) | +10 |
| Screenshot | 2 (ss-001, ss-002) | 12 (ss-001..ss-012) | +10 |
| **Total** | **8** | **48** | **+40** |

Screenshot mode was expanded in two follow-up steps (2026-08-01): first 2→6 with 4 puzzles, then 6→12 with 6 more puzzles, all using verified public-domain NASA images from Wikimedia Commons.

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

### 3. Screenshot mode expansion (2026-08-01)

Added 4 new screenshot puzzles (ss-003..ss-006) with verified public-domain NASA images sourced from Wikimedia Commons:

| ID | Target | Domain | Source | Main size | Blur size |
|----|--------|--------|--------|-----------|-----------|
| ss-003 | Hurricane | nature | Hurricane Isabel eye from ISS (NASA astronaut Ed Lu) | 16.9 KB | 0.07 KB |
| ss-004 | Aurora Borealis | nature | ISS-42 Aurora borealis over North Atlantic (NASA/Samantha Cristoforetti) | 10.1 KB | 0.09 KB |
| ss-005 | Amazon River | geography | Space Shuttle STS078-751-094 (NASA) | 72.4 KB | 0.09 KB |
| ss-006 | New York City | geography | ISS-53 Night Lights (NASA) | 74.4 KB | 0.07 KB |

**License verification:** each image's `LicenseShortName` was checked via the Wikimedia Commons API `extmetadata` endpoint — all return `Public domain`. Attribution recorded per-file in the `imageAttribution` field.

**Image processing:** Python/Pillow (already available, no new npm dep — guardrail #3). Each image: downloaded full-resolution JPEG → center-cropped to 16:9 → resized to 960×540 → saved as WebP with quality adjusted to stay ≤80KB (DECISIONS.md cap). Blur LQIP: 20×15px, Gaussian blur, WebP quality 5, output 0.07–0.09 KB each (≤5KB cap).

### 4. Screenshot mode expansion (2026-08-01, cont.) — 6→12

Added 6 more screenshot puzzles (ss-007..ss-012) with verified public-domain NASA images, bringing Screenshot to 12 puzzles — matching the other three modes. This batch deliberately expands domain coverage beyond the geography/nature cluster of ss-001..ss-006 to include history, science, and everyday:

| ID | Target | Domain | Source | Main size | Blur size |
|----|--------|--------|--------|-----------|-----------|
| ss-007 | Grand Canyon | geography | Grand Canyon from space (NASA) | 57.7 KB | 0.06 KB |
| ss-008 | Great Pyramid of Giza | history | ISS-32 Pyramids at Giza, Egypt (NASA) | 78.3 KB | 0.07 KB |
| ss-009 | Palm Jumeirah | everyday | ISS-47 Palm Jumeirah, Dubai (NASA/Tim Kopra) | 78.3 KB | 0.08 KB |
| ss-010 | Solar Eclipse | science | 2024 Total Solar Eclipse (NASA GRC/Jordan Salkin) | 4.4 KB | 0.06 KB |
| ss-011 | Wildfire | nature | 2018-08-04 Wildfire Smoke Across Western US (NASA WorldView) | 78.7 KB | 0.07 KB |
| ss-012 | Colosseum | history | ISS048-E-12677 Colosseum, Rome (NASA JSC ESRS, cropped) | 77.6 KB | 0.06 KB |

**Domain distribution (all 12 Screenshot puzzles):** geography 5 (Everest, Sahara, Amazon, NYC, Grand Canyon), nature 3 (Hurricane, Aurora, Wildfire), history 2 (Great Pyramid, Colosseum), science 1 (Solar Eclipse), everyday 1 (Palm Jumeirah). All 5 `DomainEnum` values are now represented.

**License verification:** each image's `LicenseShortName` was checked via the Wikimedia Commons API `extmetadata` endpoint — all return `Public domain`. Attribution recorded per-file in the `imageAttribution` field.

**Image processing:** same Python/Pillow pipeline as section 3 (no new npm dep — guardrail #3). Each image: downloaded a 1280px thumbnail via the Wikimedia API → center-cropped to 16:9 → resized to 960×540 → saved as WebP with quality adjusted to stay ≤80KB. Blur LQIP: 20×15px, Gaussian blur, WebP quality 5, output 0.06–0.08 KB each (≤5KB cap).

**Note on ss-008 and ss-012 compression:** these two images (Pyramids and Colosseum) have high-frequency urban/desert detail that kept them above 80 KB at the normal quality floor of 30. They were re-compressed from the saved WebP at quality 22 (ss-008) and 20 (ss-012) to meet the cap. This is a second lossy encode, so there is minor quality loss — acceptable for a guessing-game screenshot where the image starts blurred and sharpens progressively.

## Files changed

**New (46 files):**
- `src/data/keywords/kw-003.json` through `src/data/keywords/kw-012.json`
- `src/data/emoji/em-003.json` through `src/data/emoji/em-012.json`
- `src/data/timeline/tl-003.json` through `src/data/timeline/tl-012.json`
- `src/data/screenshot/ss-003.json` through `src/data/screenshot/ss-006.json`
- `src/data/screenshot/ss-007.json` through `src/data/screenshot/ss-012.json`
- `public/images/puzzles/ss-003.webp`, `ss-003-blur.webp`
- `public/images/puzzles/ss-004.webp`, `ss-004-blur.webp`
- `public/images/puzzles/ss-005.webp`, `ss-005-blur.webp`
- `public/images/puzzles/ss-006.webp`, `ss-006-blur.webp`
- `public/images/puzzles/ss-007.webp`, `ss-007-blur.webp`
- `public/images/puzzles/ss-008.webp`, `ss-008-blur.webp`
- `public/images/puzzles/ss-009.webp`, `ss-009-blur.webp`
- `public/images/puzzles/ss-010.webp`, `ss-010-blur.webp`
- `public/images/puzzles/ss-011.webp`, `ss-011-blur.webp`
- `public/images/puzzles/ss-012.webp`, `ss-012-blur.webp`

**Modified (2 files):**
- `docs/STATUS.md` — added Phase 4o entries to the Key Decisions Log; updated Next Actions to reflect partial completion of the content expansion target.
- `docs/handoff/phase-4o-puzzle-bank-expansion.md` — this handoff document.

## Verification

All validation gates green:

| Gate | Result |
|------|--------|
| `npm run content:check` | 48/48 schema passed, 12 referenced assets (0 missing, 0 oversized), 0 duplicate problems |
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

1. Review the 40 new puzzles for content quality, factual accuracy, and difficulty calibration.
2. Decide whether the cross-mode target overlap (§1) is acceptable for launch, or request a follow-up content pass to deduplicate Keywords ↔ Emoji targets.
3. Decide whether to continue toward the 50+ per-mode target (current: 12/12/12/12 = 48 total), or accept the current 12-per-mode distribution as sufficient for launch.
4. Fix the Deploy workflow (Cloudflare `apiToken` secret not configured — unrelated to current work).
