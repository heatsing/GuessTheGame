# Handoff: Slice 4d-8 — /daily Daily Mixed Challenge page

> Date: 2026-07-26 · From: Engineer · To: Reviewer / Owner

## Scope

Slice 4d-8 delivers the **Daily Mixed Challenge** page (`/daily`) — the MVP flagship mode per PRD §5.1. This is the final UI-wiring slice in Phase 4d, completing all 5 MVP game modes.

The page aggregates the player's progress across the 4 per-mode puzzles (Keywords, Emoji, Screenshot, Timeline) for today's UTC date, shows the daily total score with the streak multiplier, and exposes a share button once all 4 puzzles are resolved.

## Delivered

### 1. `DailyChallenge` client component — `src/components/game/DailyChallenge.tsx`

Interactive dashboard (PRD §5.1, §7.2). Renders:

- **Date + streak banner** — today's UTC date, current streak count, and the live multiplier (`1.00x` / `1.05x` / `1.10x` / `1.20x` / `1.50x` per PRD §7.2 boundaries).
- **4 mode cards** — one per mode (Keywords / Emoji / Screenshot / Timeline), each linking to its `/play/{mode}` page. Each card shows a status badge (`Play` / `Resume` / `Solved` / `Given up`) and, when completed, the per-mode score (0–100). The 4 `/play/{mode}` pages serve the same daily puzzle via `selectDailyPuzzleForMode`, so progress is consistent whether the player enters from `/daily` or a mode page directly.
- **Summary section** — `N of 4 puzzles resolved` counter. When all 4 are resolved (solved OR given_up), shows the daily total (Σ scores / 400), the streak multiplier, the final score (total × multiplier), and a `ShareButton`. Otherwise shows a hint to complete all four.

**SSR/hydration safety**: `progress` and `streak` start as `undefined` / defaults on both server and client first-render (localStorage is only readable in the browser, inside `useEffect`). The static shell — mode names, descriptions, links — renders identically on both sides; only the progress-dependent values (status badge, score, total) fill in after mount. No hydration mismatch.

**Guardrail #9**: no direct `localStorage` calls — all reads go through `getProgress` / `getStreak` in `src/storage/actions.ts`.

**Share text builder**: `buildShareText()` produces a plain-text payload (header + date + per-mode scores + total line) that pastes cleanly into any chat app. Mode scores show as `—` when the mode has no record yet; given_up scores show as 0.

### 2. `/daily` page (server component) — `src/app/daily/page.tsx`

Static server component emitting SEO metadata (title, description, canonical, OG, Twitter card) via `buildPageMetadata` + the `PAGE_METADATA.daily` config. Renders an H1 + intro paragraph, then the client `DailyChallenge` dashboard. Fully static-cacheable.

### 3. Site-config + sitemap + navigation wiring

- **`src/lib/site-config.ts`**: added `PAGE_METADATA.daily` entry (title, description, path `/daily`).
- **`src/app/sitemap.ts`**: added `/daily` route (priority 0.9, changeFrequency daily) for SEO discovery.
- **`src/components/layout/SiteHeader.tsx`**: added `Daily` link to desktop nav.
- **`src/components/layout/BottomNav.tsx`**: added `Daily` link to mobile bottom nav (icon ★).
- **`src/app/page.tsx`** (homepage): added a prominent Daily Mixed Challenge CTA card above the "Quick play" section.

### 4. Scoring shared helpers (already delivered in 4d-1, consumed here)

The dashboard consumes three pure functions from `src/lib/game/scoring.ts`:
- `computeDailyTotal({ keywords, emoji, screenshot, timeline })` — sums the 4 per-mode scores (treating undefined as 0).
- `streakMultiplier(currentStreak)` — PRD §7.2 tiered multiplier (0→1.00x, 1-2→1.05x, 3-6→1.10x, 7-9→1.20x, 10+→1.50x).
- `finalDailyScore(total, multiplier)` — `Math.round(total * multiplier)`.

### 5. Tests — `src/components/game/DailyChallenge.test.tsx` (15 tests, new)

Covers:
- **Initial render (no progress)**: 4 mode cards rendered, all show "Play" badge, "0 of 4 puzzles resolved", no share button, hint shown.
- **Mode card links**: each card links to its `/play/{mode}` page with correct `href`.
- **Partial progress**: solved modes show scores + "Solved" badge; unsolved modes still show "Play"; "2 of 4 puzzles resolved"; given_up shows "Given up" badge + score 0.
- **Complete (all 4 solved)**: daily total (300/400), multiplier (1.20x for 7-day streak), final score (360), share button appears, "4 of 4 puzzles resolved".
- **Complete (all 4 given_up)**: still treated as complete — share button appears (score 0).
- **Share text content**: header + date + per-mode scores + total line (`Total: 300 × 1.20x = 360`).
- **Streak multiplier display**: 1.00x for streak 0, 1.20x for 7-day (PRD §7.2 boundary), 1.50x for 10+.
- **Today date display**: banner shows `Today (UTC): YYYY-MM-DD`.

Mock pattern follows the established template (`vi.hoisted` for factory-shared variables, mocks for `@/storage/actions`, `@/lib/game/utc`, and `./ShareButton`).

## Verification (all green)

| Gate | Result |
|------|--------|
| `npm run typecheck` | clean |
| `npm run lint` | 0 errors, 0 warnings |
| `npm run test` | 401 tests, 29 files, all pass (+37 new vs. 4d-7's 364/28) |
| `npm run content:check` | 8/8 valid, 0 missing, 0 oversized |
| `npm run build` | 18 static pages generated (was 17, +1 for /daily; Windows phantom-file handled by wrapper) |

## Phase 4d completion

This slice closes Phase 4d (game UI wiring). All 5 MVP modes are now wired:

| Mode | Slice | Status |
|------|-------|--------|
| Keywords | 4d-3 | done |
| Emoji | 4d-4 | done |
| Screenshot (P1-10 blur tiers) | 4d-5 | done |
| Timeline | 4d-6 | done |
| P1-10 preload + compression | 4d-7 | done |
| Daily Mixed Challenge | 4d-8 | done |

### Carryover (still open)

- **P0-1 (asset replacement)** — `ss-001`/`ss-002` are still generated placeholder `.webp` files (attribution correctly labeled `placeholder`). When real IP-safe public-domain images replace them, regenerate the blur thumbnails.
- **P2-34** — `SiteHeader`/`BottomNav` server-side active-state — deferred (architecture change, not polish).
- **Low-value P2** items deferred per `docs/testing/final-code-review.md` § "Deferred".

## For the next phase

Per AGENTS.md guardrail #13, do not auto-advance. The owner should review this slice and decide whether to:
1. Accept Phase 4d as complete and move to final acceptance / launch prep.
2. Request additional polish or fixes.
3. Address the P0-1 asset replacement carryover before launch.
