# Handoff: P0-1 — Screenshot asset replacement (public-domain NASA images)

> Date: 2026-07-26 · From: Engineer · To: Reviewer / Owner

## Scope

Resolves **P0-1** from `docs/testing/final-code-review.md` and **H-1** from `docs/SECURITY-REVIEW.md`:
> "Fabricated image attribution on screenshot placeholders — replace the placeholder `.webp` files with genuinely licensed images (public-domain NASA/Wikimedia files, verified per-file) and set `imageAttribution`/`imageLicense` to the real per-file values."

This was the **only remaining pre-launch P0 item**. With this fix, no P0 or P1 findings remain open.

## What was done

### 1. Sourced verified public-domain images

Both images were sourced from Wikimedia Commons and their license verified per-file via the Wikimedia API `extmetadata` endpoint (`action=query&prop=imageinfo&iiprop=extmetadata`), which returned `LicenseShortName: "Public domain"` for both.

| Puzzle | Wikimedia file | Author | License | Source |
|--------|---------------|--------|---------|--------|
| ss-001 (Mount Everest) | `Mount_Everest_ISS008-E-6150.JPG` | NASA ISS Expedition 8 Crew | Public domain | NASA Earth Observatory — "The Many Faces of Mount Everest" |
| ss-002 (Sahara) | `Desert_Patterns_(5182689540).jpg` | NASA Goddard Space Flight Center | Public domain | NASA GSFC, via Flickr |

NASA-created images are works of the U.S. federal government and are automatically in the public domain (no copyright protection). Both Wikimedia Commons file pages confirm this license.

### 2. Processed images (Python + Pillow, no new npm dep — guardrail #3)

A Python script (`process_images.py`) using Pillow performed:

- **Center-crop to 16:9** — both source images had non-16:9 aspect ratios (1000×663 and 1280×1271); center-cropped to match the `GameImage` display frame (640×360).
- **Resize to 960×540** — 1.5× the display size for retina sharpness.
- **Binary-search WebP compression** — finds the highest quality that fits under the 80 KB cap (`scripts/lib/validators.mjs` enforces `IMAGE_MAX_KB = 80`).
- **Blur LQIP thumbnails** — 32×18 px, Gaussian blur radius 1.2, compressed to ≤5 KB (cap: `BLUR_SRC_MAX_KB = 5`).

| Asset | Dimensions | Size | Quality | Cap |
|-------|-----------|------|---------|-----|
| `ss-001.webp` | 960×540 | 79.1 KB | q60 | ≤80 KB ✓ |
| `ss-001-blur.webp` | 32×18 | 0.1 KB | q60 | ≤5 KB ✓ |
| `ss-002.webp` | 960×540 | 78.3 KB | q47 | ≤80 KB ✓ |
| `ss-002-blur.webp` | 32×18 | 0.1 KB | q60 | ≤5 KB ✓ |

Note: ss-002 (Sahara) required a lower quality (q47) because the satellite image has more high-frequency detail (desert dune patterns) than the Everest photo. The image starts fully blurred (level 3 = 24px) in-game, so the lower quality is not visible during gameplay and only marginally visible at level 0 (sharp).

### 3. Updated JSON fixtures

`src/data/screenshot/ss-001.json` and `ss-002.json`:

- `imageLicense`: `"placeholder"` → `"public-domain"`
- `imageAttribution`: placeholder warning text → real per-file NASA attribution with Wikimedia source file name

### 4. Updated `SECURITY-REVIEW.md`

- H-1 status upgraded from "CORRECTED" to "RESOLVED" with full resolution details (per-file image source, license verification method, processing parameters).
- Summary paragraph updated to reflect H-1 is fully resolved.
- "Recommended Action Priority" updated — H-1 no longer requires action.
- About-page copyright claim accuracy note updated — the About page's "public-domain images from Wikimedia Commons and NASA" claim is now true.

### 5. Updated `STATUS.md`

- New Key Decisions Log entry for 2026-07-26 P0-1 resolution.
- Blockers section updated — no pre-launch blockers remain.
- Carryover section — P0-1 marked RESOLVED.
- Next Actions updated — P0-1 step removed; Medium security items (M-1/M-2/M-3) added as pre-launch work.

## Files changed

| File | Change |
|------|--------|
| `public/images/puzzles/ss-001.webp` | Replaced — placeholder → NASA Mount Everest (79.1 KB) |
| `public/images/puzzles/ss-001-blur.webp` | Regenerated — 0.1 KB LQIP |
| `public/images/puzzles/ss-002.webp` | Replaced — placeholder → NASA Sahara (78.3 KB) |
| `public/images/puzzles/ss-002-blur.webp` | Regenerated — 0.1 KB LQIP |
| `src/data/screenshot/ss-001.json` | `imageLicense` + `imageAttribution` updated |
| `src/data/screenshot/ss-002.json` | `imageLicense` + `imageAttribution` updated |
| `docs/SECURITY-REVIEW.md` | H-1 upgraded to RESOLVED; summary + priority updated |
| `docs/STATUS.md` | P0-1 resolution logged; blockers/carryover/next-actions updated |

## Verification (all green)

| Gate | Result |
|------|--------|
| `npm run content:check` | 8 puzzles valid, 0 missing, 0 oversized |
| `npm run typecheck` | clean |
| `npm run lint` | 0 errors, 0 warnings |
| `npm run test` | 401 tests, 29 files, all pass |
| `npm run build` | 18 pages compiled (Windows NTFS phantom-file bug on local export copy — CI/Linux unaffected; non-export retry passed) |

## Guardrails compliance

| # | Rule | Compliance |
|---|------|-----------|
| 3 | No casual dependencies | ✓ Python/Pillow used for processing (no npm dep added); Pillow is a dev-time tool, not a runtime dep |
| 7 | No fabricated APIs/databases | ✓ Images are real public-domain NASA files; license verified via Wikimedia API, not assumed |
| 8 | No fabricated user data | ✓ No fake leaderboards or synthetic counts |
| 12 | No skipped handoff docs | ✓ This document |
| 13 | No auto-advance | ✓ Awaiting owner approval |

## Remaining pre-launch work (not P0/P1)

- **M-1:** Add `/privacy` and `/contact` pages (Privacy disclosure + copyright takedown path)
- **M-2:** Add answer-exposure honesty note to `/how-to-play` or About
- **M-3:** Add CSP + `X-Frame-Options`/`frame-ancestors` to `public/_headers`
- **Content expansion:** 50+ puzzles per mode (currently 8 total)
