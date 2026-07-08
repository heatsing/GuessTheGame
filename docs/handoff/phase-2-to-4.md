# Handoff: Phase 2 → Phase 4 (Engineer)

> Date: 2026-07-09 · From: Solution Architect · To: Engineer

## What was delivered

- `docs/architecture.md` — Static application architecture covering 14 topics, each with rationale, alternatives, and trade-offs
- `docs/DECISIONS.md` — 8 Architecture Decision Records (ADR-001 to ADR-008)

## Key architectural decisions

1. **Next.js App Router with `output: 'export'`** — full static export, no server runtime
2. **Three-layer module boundary** — `lib/engine/` (pure functions), `data/` (JSON content), `components/` (React UI)
3. **localStorage as primary storage** — single key, schema-versioned, < 100KB target
4. **Pre-generated daily schedule** — `data/daily-schedule.json` maps UTC dates to puzzle IDs for 365 days
5. **CSS filter blur** for Screenshot mode — no pre-generated image variants needed
6. **Client-side search** via fuse.js with pre-built index at build time
7. **WebP images** with JPEG fallback
8. **`generateStaticParams`** for `/play/[mode]` and `/archive/[date]` dynamic routes

## What the Engineer needs to build

### Project setup
- `next.config.mjs` with `output: 'export'`
- TypeScript strict mode
- ESLint with import boundary rules (engine cannot import React/UI)
- Tailwind CSS v4

### Directory structure
```
src/
  lib/
    engine/          # Pure functions, no React
      scoring.ts     # Score calculation per mode
      match.ts       # Guess matching (case-insensitive, aliases)
      streak.ts      # Streak tracking, multiplier
      schedule.ts    # Daily schedule lookup
      timeline.ts    # Position error calculation
    storage/         # localStorage wrapper
      types.ts       # Schema types with version
      migrate.ts     # Migration functions
      storage.ts     # Read/write/patch
    search/          # fuse.js index
    content/         # Content loaders
  data/              # JSON puzzle files
    keywords/        # One file per puzzle
    emoji/
    screenshot/
    timeline/
    daily-schedule.json
    puzzle-index.json
  components/        # React UI (per UX spec)
  app/               # Next.js App Router pages
```

### Engine functions to implement first (unit-testable)
- `matchGuess(input, target, aliases): boolean`
- `calculateKeywordsScore(revealedCount, wrongCount): number`
- `calculateEmojiScore(wrongCount, hintCount): number`
- `calculateScreenshotScore(wrongCount, sharpenCount): number`
- `calculateTimelineScore(positionErrors, hintCount): number`
- `calculateDailyTotal(puzzleScores): number`
- `getStreakMultiplier(streakDays): number`
- `calculateFinalScore(dailyTotal, multiplier): number`
- `getDailyPuzzles(dateString): PuzzleIds`

### Build pipeline
- `next build` → static export to `out/`
- Pre-build script: generate `daily-schedule.json` + `puzzle-index.json`
- CI checks: schedule expiry, content validation, unit tests, E2E

### POC verification (from architecture doc)
12 key technical points to validate before full implementation — see architecture.md "POC Verification Checklist".

## Risks for implementation

- R6: Daily schedule expiry — CI must check and alert
- R4: localStorage quota — keep stored data minimal, implement pruning
- R5: Emoji cross-platform — test early on real devices
