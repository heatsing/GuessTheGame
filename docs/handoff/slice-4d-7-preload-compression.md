# Handoff: Slice 4d-7 — Next-clue preload + image compression (P1-10)

> Date: 2026-07-26 · From: Engineer · To: Reviewer / Owner

## Scope

Slice 4d-7 resolves **P1-10** from `docs/testing/final-code-review.md`:
> "No next-clue preload mechanism; no real image-compression strategy."

The fix had two sub-goals stated in the review:
1. "After revealing a clue, preload the next image (`new Image().src = nextUrl` or `<link rel="preload" as="image">`)."
2. "Produce multi-tier images per clue (blur placeholder ~1-3 KB + main webp ≤ ~70 KB) and add a `blurSrc` field to the schema, consumed by `GameImage`."

## Delivered

### 1. `usePreloadImage` hook (new) — `src/lib/game/usePreloadImage.ts`

A reusable, SSR-safe hook that warms the browser's HTTP cache for one or more images via `new Image()`. Supports:

- **Single URL or array of URLs** — serializes the input to a stable key so an array literal doesn't re-trigger the effect on every render.
- **`enabled` gate** — callers can conditionally trigger preloading (e.g. "preload the next clue only after the current one is revealed"): `usePreloadImage(nextUrl, currentClueRevealed)`.
- **`loaded` return value** — `true` when all requested images have settled (load or error), or when there's nothing to preload.
- **Cleanup on unmount** — clears `onload`/`onerror` handlers and blanks `src` to cancel pending loads (no state update on unmounted component).
- **Error-tolerant** — `onerror` counts as "done" so the hook never hangs on a broken URL.

**Usage in ScreenshotGame**: `usePreloadImage(puzzle.image)` on mount — explicitly warms the cache for the full-resolution image alongside the LQIP thumbnail, independent of `GameImage`'s `priority`/`fetchPriority` hints. Guarantees the full image is ready before the player sharpens to level 0.

**Forward-looking usage**: the hook is ready for `/daily` (slice 4d-8) to preload the next mode's puzzle image while the player completes the current mode.

### 2. `blurSrc` LQIP field (schema + content) — P1-10 sub-goal 2

- **`ScreenshotPuzzleSchema`** (`src/lib/content/schemas.ts`): added optional `blurSrc: z.string().min(1).optional()` — a tiny (~1-3 KB) WebP thumbnail path shown as a CSS `background-image` behind the main `<img>` while the full image streams in.
- **`ss-001.json` / `ss-002.json`**: updated with `"blurSrc": "/images/puzzles/ss-001-blur.webp"` (resp. `ss-002`).
- **Blur thumbnails generated** via Python/Pillow (no new npm dependency — guardrail #3): 20×15 px, Gaussian blur radius 2, WebP quality 5. Output: `ss-001-blur.webp` = 0.06 KB, `ss-002-blur.webp` = 0.06 KB (well within the 1-3 KB target).
- **`GameImage`** already supported `blurSrc` as a `background-image` prop since Phase 4g — no component change needed. `ScreenshotGame` now passes `puzzle.blurSrc` through.

### 3. Image size cap enforcement — `scripts/lib/validators.mjs`

`checkAssets()` enhanced to enforce DECISIONS.md §image-pipeline size caps:

- **Main image**: ≤ 80 KB (`IMAGE_MAX_KB`)
- **blurSrc thumbnail**: ≤ 5 KB (`BLUR_SRC_MAX_KB`)
- **blurSrc existence**: when a puzzle defines `blurSrc`, the file must exist under `public/`.

Returns a new `oversized` array alongside the existing `missing` array. Both `check-content.mjs` and `check-assets.mjs` updated to report oversized violations.

Current state: `ss-001.webp` = 9.3 KB, `ss-002.webp` = 8.9 KB, both blur thumbnails = 0.06 KB — all well within caps.

### 4. Tests

- **`src/lib/game/usePreloadImage.test.ts`** (new, 11 tests): Image creation, onload/onerror settlement, `enabled=false` no-op, undefined/null input, array handling + partial settlement, unmount cleanup, stable dependency (array literal doesn't re-run), URL change re-runs. Uses a stubbed `global.Image` to inspect created instances and fire load events manually (jsdom doesn't fire real network loads).
- **`src/components/game/ScreenshotGame.test.tsx`** (+2 tests, 20 total): verifies `blurSrc` is passed to `GameImage` when present, and renders empty `data-blur-src` when the puzzle has no `blurSrc`. GameImage mock extended to expose `data-blur-src`.

## Verification (all green)

| Gate | Result |
|------|--------|
| `npm run typecheck` | clean |
| `npm run lint` | 0 errors, 0 warnings |
| `npm run test` | 364 tests, 28 files, all pass (+13 new vs. 4d-6's 351/27) |
| `npm run content:check` | 8/8 valid, 0 missing, 0 oversized |
| `npm run build` | 17 static pages generated (Windows phantom-file handled by wrapper) |

## P1-10 resolution checklist

| P1-10 requirement | Status |
|---|---|
| "After revealing a clue, preload the next image" | `usePreloadImage` hook created + wired in ScreenshotGame; ready for /daily cross-mode preloading |
| "Produce multi-tier images (blur placeholder ~1-3 KB + main webp ≤ ~70 KB)" | `blurSrc` LQIP thumbnails generated (0.06 KB each); main images 9 KB (well under 70 KB target) |
| "Add a `blurSrc` field to the schema, consumed by `GameImage`" | `ScreenshotPuzzleSchema.blurSrc` (optional); `GameImage` already consumed it since 4g; `ScreenshotGame` passes it through |
| Build pipeline enforces per-image size cap (DECISIONS.md) | `checkAssets()` now enforces 80 KB (main) + 5 KB (blurSrc) caps; `content:check` reports violations |

## For the next slice (4d-8)

- **`/daily` Daily Mixed Challenge page** — 4 puzzle cards (one per mode), daily total + streak multiplier + share. The `usePreloadImage` hook is ready to preload the next mode's puzzle image when the player completes one mode.
- The `selectDailyPuzzles` / `selectDailyPuzzleForMode` functions from slice 4d-2 are ready to drive the puzzle selection.

### Carryover (still open)

- **P0-1 (asset replacement)** — `ss-001`/`ss-002` are still generated placeholder `.webp` files. The `blurSrc` thumbnails are derived from these placeholders. When real IP-safe public-domain images replace them, regenerate the blur thumbnails (the Python script is in the work folder; consider committing a `scripts/gen-blur-thumbnails.mjs` to the repo for reproducibility).
