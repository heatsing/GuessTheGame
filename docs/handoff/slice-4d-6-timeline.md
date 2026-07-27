# Handoff: Slice 4d-6 — TimelineGame + /play/timeline wiring

> Date: 2026-07-26 · From: Engineer · To: Reviewer / Owner

## Scope

Slice 4d-6 implements the final MVP game mode — **Timeline** (PRD §5.5) — and wires it into the `/play/timeline` page. This closes the per-mode UI wiring set (Keywords / Emoji / Screenshot / Timeline) and completes the template-proving cycle started in 4d-3.

## Delivered

### `src/components/game/TimelineGame.tsx` (new)

Full game board per PRD §5.5:

- **Shuffled presentation** — item cards are presented in a deterministic non-chronological shuffle (seeded mulberry32 PRNG, re-rolled until it differs from the correct order so the player always has a real puzzle).
- **Reordering** — delegates to the existing `TimelineControls` component (move up/down buttons + Arrow-key roving tabindex, P2-39-compliant). No drag-and-drop yet (non-drag path is the PRD-mandated accessible alternative).
- **Submit order** — locks the arrangement and scores via `scoreTimeline` (position errors × -15, PRD §7.1 row 4).
- **Hints** — reveals one item's date (player picks which), -10 each, max 2 (PRD §5.5 "Available up to 2 times"). Hint counter is `aria-live` polite.
- **Give up** — reveals the correct chronological order with dates, score 0, terminal lock.
- **Persistence** — `recordModeResult(utcDate, "timeline", …)` via `src/storage/actions` (guardrail #9 — no direct localStorage). Storage errors → Toast; idempotent no-op → info Toast.
- **Result reveal** — on solve/give-up, shows the correct order (oldest→newest) with formatted dates (CE/BCE), the fact, a `ShareButton`, and a "Play another" reload button.

Key structural differences from Keywords/Emoji/Screenshot (documented in the component header):

- No text input / guessing — the answer is an ORDER, checked once at submit.
- No "wrong guess" penalty — position errors are scored at submission, not per-guess.
- Hints reveal a date (item-level), not a category/letter/blur-tier.
- `revealedClues` in the storage record maps to `hintsUsed` for this mode; `wrongGuesses` is always `[]`.

### `src/app/play/timeline/page.tsx` (wired)

Server component fetches the daily puzzle via `selectDailyPuzzleForMode("timeline", today)` (SSR-friendly, deterministic — same UTC date → same puzzle for every visitor), passes it to the client `TimelineGame`. Includes the standard "How to play" card and `RelatedModes` internal links. Empty-state fallback when no puzzle is available.

### `src/components/game/TimelineGame.test.tsx` (new, 16 tests)

Coverage:

- Initial render: shuffled item list, hint counter 0/2, submit + give-up buttons.
- Reordering: move up/down via buttons changes the order; Arrow keys reorder with focus-following.
- Hints: reveal one item's date (-10), disable at 2 hints, can't re-reveal the same item.
- Submit (perfect order): score 100, `recordModeResult` called with `status: "solved"`.
- Submit (imperfect order): score < 100, scales with position errors (e.g., 70 for 2-position total error).
- Give up: score 0, `status: "given_up"`, correct order revealed, terminal lock (can't transition to solved).
- Scoring integration: `scoreTimeline` + `timelinePositionErrors` invoked correctly.
- Storage error → error Toast; idempotent no-op → info Toast.

`TimelineControls` is NOT mocked — tests exercise real reorder logic. `recordModeResult` and `useToast` are mocked via `vi.hoisted()` (avoids the vi.mock hoisting trap established in 4d-3).

## Fixes applied during this slice

1. **Type error** — test fixture incorrectly included `target` and `aliases` fields (TimelinePuzzleSchema `.omit`s those per `schemas.ts`). Removed.
2. **Lint error** — `let seed` in `deterministicShuffle` was never reassigned; changed to `const seed` (`prefer-const`).

## Verification (all green)

| Gate | Result |
|------|--------|
| `npm run typecheck` | clean |
| `npm run lint` | 0 errors, 0 warnings |
| `npm run test` | 351 tests, 27 files, all pass (+16 new vs. 4d-5's 335/26) |
| `npm run content:check` | 8/8 valid, 0 missing assets, 0 duplicates |

## For the next slice (4d-7)

### What to build next

- **P1-10 next-clue preload** — preload the next clue image/data on demand so the player doesn't wait when they reveal/sharpen. Currently each reveal/sharpen is synchronous; a preload hint (`<link rel="preload">` or `new Image()` for the next tier) would smooth the experience.
- **Image compression verification** — confirm the screenshot puzzle images ship at reasonable sizes (the blur-tier CSS `filter: blur()` is applied at render time, but the source WebP should still be compressed for fast first paint). Verify `ss-001`/`ss-002` WebP sizes and consider generating explicit blur-thumbnail `blurSrc` tiers if first paint is slow.

### Carryover (still open from prior phases)

- **P0-1 (asset replacement)** — `ss-001`/`ss-002` are still generated placeholder `.webp` files. Attribution is correctly flagged as `placeholder` (no longer misrepresented), but real IP-safe public-domain images should replace them before launch.
- **Slice 4d-8** — `/daily` Daily Mixed Challenge page (4 puzzle cards, one per mode, daily total + streak multiplier + share).
