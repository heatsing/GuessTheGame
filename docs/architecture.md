# Architecture — Guess the Game

> Companion document to [`PRD.md`](./PRD.md). This document specifies the static-site architecture, module boundaries, data layer, build pipeline, and migration triggers for the no-backend, no-database MVP defined in the PRD.
>
> Created: 2026-07-09 · Status: Draft · Owner: Solution Architect

---

## Table of Contents

1. [Next.js App Router Static Export](#1-nextjs-app-router-static-export)
2. [TypeScript Module Boundaries](#2-typescript-module-boundaries)
3. [Static Content Organization (JSON / TS)](#3-static-content-organization-json--ts)
4. [Game Index and Puzzle File Splitting](#4-game-index-and-puzzle-file-splitting)
5. [Daily Challenge Schedule](#5-daily-challenge-schedule)
6. [localStorage Data Layer](#6-localstorage-data-layer)
7. [Schema Versioning and Migration](#7-schema-versioning-and-migration)
8. [Search Index](#8-search-index)
9. [Game Engine and UI Separation](#9-game-engine-and-ui-separation)
10. [Static Generation of Dynamic Routes](#10-static-generation-of-dynamic-routes)
11. [Image Processing](#11-image-processing)
12. [Error Handling](#12-error-handling)
13. [Testing Layers](#13-testing-layers)
14. [Build and Deployment Pipeline](#14-build-and-deployment-pipeline)
15. [POC Verification Checklist](#15-poc-verification-checklist)
16. [When to Migrate to a Database](#16-when-to-migrate-to-a-database)

---

## 1. Next.js App Router Static Export

### Why this approach

The PRD mandates a hard constraint: **no database, no accounts, no runtime backend, and the entire product runs as a static site** (PRD §1, §4.2). Next.js App Router with `output: 'export'` produces a fully static HTML/CSS/JS bundle that can be hosted on any CDN (Vercel, Cloudflare Pages, GitHub Pages, Netlify) at near-zero cost and sub-second load times (PRD AC-41, AC-42).

App Router also gives us:
- **File-based routing** that maps 1:1 to the information architecture in PRD §3.
- **React Server Components at build time** to inline puzzle JSON into HTML, eliminating client-side data fetching for the initial render.
- **`generateStaticParams`** to pre-render every `/archive/[date]` and `/play/[mode]` route at build time.
- **One cohesive React/TypeScript model** across engine + UI, matching the team's expertise.

### Configuration

```ts
// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  images: { unoptimized: true },   // required for static export
  trailingSlash: true,             // friendly to static hosts
  reactStrictMode: true,
};
module.exports = nextConfig;
```

### Limitations and unavailable features

With `output: 'export'`, the following are **unavailable** and the architecture must work around them:

| Feature | Status | Workaround |
|---|---|---|
| `next/image` optimization | Disabled | Use `unoptimized: true`; ship pre-optimized WebP (see §11). |
| API routes (`/api/*`) | Unavailable | All logic is client-side or build-time. |
| Server-side rendering at runtime | Unavailable | Pages are pre-rendered at build; client hydrates. |
| Dynamic routes without `generateStaticParams` | Unavailable | All dynamic segments must enumerate params (see §10). |
| ISR / `revalidate` | Unavailable | Content updates require a rebuild + redeploy. |
| Middleware / edge functions | Unavailable | No request-time logic; all routing is static. |
| `headers()`, `cookies()`, dynamic `searchParams` | Unavailable at runtime | Use client-side hooks for query parsing. |
| Streaming / Suspense data fetch | Unavailable | All async data resolves at build time. |

These limitations are **acceptable** because the PRD explicitly scopes them out (no server-side score collection, no dynamic content updates in MVP — PRD §4.2, §10.3).

### Alternatives considered

1. **Astro** — Purpose-built for static content sites; ships zero JS by default; excellent for content-heavy pages.
   - **Rejected because:** Our app has significant interactive game logic (drag-and-drop reordering, blur toggles, real-time guess matching, streak state machines). React's component model and hooks are a better fit for interactive puzzle UIs than Astro islands. Using Astro with React islands would mean maintaining two frameworks and two mental models. Next.js gives us one cohesive React-first model with equivalent static output.

2. **Gatsby** — Pioneered SSG + GraphQL data layer.
   - **Rejected because:** Gatsby's GraphQL data layer is overkill for our flat JSON content model. Build times and plugin maintenance have aged less gracefully than Next.js. The team's React expertise maps directly to Next.js; Gatsby's conventions (node creation, page queries) add learning overhead without proportional benefit.

3. **Vite + React + vite-plugin-ssr (or SvelteKit static)** — Roll-your-own SSG.
   - **Rejected because:** We would have to build routing, static param generation, link prefetching, and image handling ourselves. Next.js provides these batteries-included. The maintenance burden is not justified for a small team.

4. **Plain HTML + vanilla JS** — Absolute simplest option.
   - **Rejected because:** Five game modes with shared state (streak, daily progress, share cards) would become a tangled mess without a component model. We would lose TypeScript type safety across the UI layer and the ability to colocate engine tests with components.

---

## 2. TypeScript Module Boundaries

### Why this approach

The product has three distinct concerns that change at different rates and for different reasons:

- **Engine** — pure game logic (scoring, guess matching, shuffle, streak math). Changes when rules change. Must be unit-testable with zero React/Next dependencies.
- **Data** — puzzle JSON, schedules, indices. Changes when content is added. Must be validatable independent of UI.
- **UI** — React components, pages, hooks. Changes when UX changes. Must be swappable without touching engine logic.

Mixing these layers leads to logic coupled to React (hard to test), content coupled to components (hard to audit), and a build that is impossible to reason about. A strict three-layer separation keeps each layer independently testable, auditable, and replaceable — which directly supports PRD AC-13, AC-17, AC-23, AC-29, AC-33 (all of which require unit-testable scoring functions).

### Directory structure

```
guess-the-game/
├── src/
│   ├── engine/                 # Layer 1: pure game logic (NO React, NO Next imports)
│   │   ├── scoring.ts          # per-mode scoring formulas (PRD §7.1)
│   │   ├── streak.ts           # streak multiplier table + increment logic (PRD §7.2, 7.3)
│   │   ├── match.ts            # case-insensitive guess matching + alias resolution
│   │   ├── shuffle.ts          # deterministic, seeded shuffle for Timeline + daily selection
│   │   ├── schedule.ts         # date→puzzle-id resolution (PRD §6.3)
│   │   ├── share.ts            # text result card generation (PRD §9.1 AC-7)
│   │   └── __tests__/          # unit tests, no DOM
│   ├── data/                   # Layer 2: content + indices (NO React, NO Next imports)
│   │   ├── puzzles/            # see §3, §4
│   │   ├── daily-schedule.json # see §5
│   │   ├── search-index.json   # see §8
│   │   ├── schema.ts           # Zod / TS types for puzzle objects (PRD §6.1)
│   │   └── validate.ts         # content audit script (PRD AC-21, AC-22)
│   ├── ui/                     # Layer 3: React components + pages
│   │   ├── app/                # Next.js App Router pages
│   │   ├── components/         # presentational + container components
│   │   ├── hooks/              # React hooks (useLocalStorage, useDailyProgress, etc.)
│   │   └── lib/                # UI-only utilities (className merge, format)
│   └── storage/                # localStorage wrapper (sits between engine + UI; NO React)
│       ├── client.ts           # read/write wrapper (see §6)
│       ├── migrate.ts          # schema migrations (see §7)
│       └── keys.ts             # central key registry
├── scripts/                    # build-time codegen (see §5, §8, §14)
│   ├── gen-schedule.ts
│   ├── gen-search-index.ts
│   └── audit-content.ts
├── public/
│   └── images/puzzles/         # WebP assets (see §11)
└── docs/
```

### Import rules (enforced by ESLint `no-restricted-imports` + `eslint-plugin-import`)

| Layer | May import from | May NOT import from |
|---|---|---|
| `engine/` | `engine/`, `data/schema.ts` (types only) | `ui/`, `next/*`, `react/*`, DOM APIs |
| `data/` | `data/`, `engine/` (types only) | `ui/`, `next/*`, `react/*` |
| `storage/` | `storage/`, `engine/`, `data/schema.ts` | `ui/`, `next/*`, `react/*` |
| `ui/` | `ui/`, `engine/`, `data/`, `storage/` | (anything is fine; UI is the top of the graph) |

The engine layer must remain **isomorphic** — it can run in Node (tests, build scripts) and in the browser (client components) without modification. This is enforced by:
- No `window`, `document`, `localStorage`, or `fetch` references in `engine/` or `data/`.
- ESLint rule: `no-restricted-globals` for DOM globals inside `engine/` and `data/`.
- CI check: engine unit tests run in pure Node (no jsdom) to prove no DOM coupling.

### Alternatives considered

1. **Single `src/` flat folder with naming conventions** (e.g., `*.engine.ts`, `*.ui.ts`).
   - **Rejected because:** Naming conventions decay under pressure. Without physical folder boundaries and an import linter, a developer under deadline will reach across layers. Folder + ESLint enforcement makes violations a CI failure, not a code-review negotiation.

2. **Monorepo with separate packages** (`@guess/engine`, `@guess/data`, `@guess/ui`).
   - **Rejected because:** A monorepo adds tooling overhead (workspaces, build ordering, publish config) that is disproportionate for a single deployable static site. The same isolation can be achieved with folder boundaries + import linting at zero tooling cost. We can extract packages later if a second consumer of the engine appears (e.g., a React Native app).

3. **Feature-sliced design** (a community architecture).
   - **Rejected because:** Feature-sliced design optimizes for large teams and long-lived enterprise apps with many features. Our app has one feature (the game) with five modes. The overhead of features/pages/widgets/entities layers is not justified.

---

## 3. Static Content Organization (JSON / TS)

### Why this approach

PRD §1 and §4.2 require that **all content is curated at build time** and there is **no runtime backend**. Puzzle data must therefore be bundled into the static build. We choose **JSON as the source of truth** for puzzle content, with **TypeScript types** layered on top for compile-time safety.

JSON is chosen over `.ts` files for content because:
- Content editors and non-developers can author and review JSON without learning TypeScript.
- JSON is diff-friendly in pull requests — a content PR is purely additive data, no code execution surface.
- JSON can be validated by a standalone schema script (see §13) without importing any runtime code.
- JSON files are trivially consumable by both the Next.js build and standalone Node scripts (schedule generation, search index generation, content audit).

TypeScript `.ts` files are used for:
- Schema definitions (`data/schema.ts`) — Zod schemas + inferred types.
- Engine logic (`engine/*`).
- Codegen scripts (`scripts/*`).

### `data/` directory structure

```
src/data/
├── schema.ts                          # Zod schemas for all 4 puzzle types + indices
├── puzzles/
│   ├── keywords/
│   │   ├── kw-001.json                # one file per puzzle (see §4)
│   │   ├── kw-002.json
│   │   └── ...
│   ├── emoji/
│   │   ├── em-001.json
│   │   └── ...
│   ├── screenshot/
│   │   └── ...
│   └── timeline/
│       └── ...
├── indices/
│   ├── keywords.index.json            # per-mode index (id, domain, difficulty, target length)
│   ├── emoji.index.json
│   ├── screenshot.index.json
│   ├── timeline.index.json
│   └── master.index.json              # union of all modes for cross-mode ops
├── daily-schedule.json                # date → { kw, em, ss, tl } puzzle IDs (see §5)
├── search-index.json                  # pre-built search index (see §8)
└── validate.ts                        # content audit entry point
```

### Puzzle file splitting strategy

**One file per puzzle**, named by `{mode-prefix}-{zero-padded-number}.json` (e.g., `kw-001.json`, `em-042.json`). Rationale:

- **Granular diffs** — adding one puzzle touches exactly one new file; reviewers see only the new content.
- **Parallel authoring** — multiple contributors can add puzzles in parallel without merge conflicts on a shared monolith file.
- **Lazy loading** — when the Daily Challenge needs only 4 puzzles, the build can statically import only those 4 files instead of parsing a 200-puzzle blob.
- **Auditable** — the content audit script (PRD AC-21, AC-22) can report per-file failures with the exact puzzle ID.

Each puzzle file conforms to the schema in PRD §6.1. The `validate.ts` script (see §13) runs at build time and fails the build on any schema violation, missing image, or missing attribution.

### Alternatives considered

1. **TypeScript `.ts` files for content** (e.g., `kw-001.ts` exporting a typed object).
   - **Rejected because:** TS content files execute code at import time, which complicates standalone auditing. They also invite "just a tiny bit of logic" creep (computed fields, conditional content) that breaks the pure-data invariant. JSON forces content to be pure data.

2. **One big `puzzles.json` per mode** (e.g., `keywords.json` containing all keyword puzzles as an array).
   - **Rejected because:** A single 200-puzzle file produces noisy diffs, merge conflicts on parallel additions, and forces the entire mode's content to be loaded even when only one puzzle is needed. Per-puzzle files scale better with content growth (PRD R1 mitigation: 50+ puzzles per mode).

3. **A headless CMS** (Sanity, Contentful) with build-time fetching.
   - **Rejected because:** Introduces a runtime dependency at build time (network call, API key, rate limits), a vendor lock-in, and a cost that contradicts the "near-zero hosting cost" goal (PRD §1). The content team can edit JSON in a PR just as easily as in a CMS, and Git gives us full history and review for free.

4. **Markdown with frontmatter** for puzzle content.
   - **Rejected because:** Puzzle data is structured (arrays of keywords, emoji sequences, item lists), not prose. Markdown shines for text-heavy content; for structured data, JSON is the natural fit and avoids a parsing layer.

---

## 4. Game Index and Puzzle File Splitting

### Why this approach

Two distinct access patterns exist:

1. **List / browse** — the archive page, the play-mode picker, the topic browser. These need metadata for many puzzles (id, domain, target length, difficulty) but not full content.
2. **Play** — a single puzzle's full content is needed to render the game.

Loading full puzzle content for a list view would ship unnecessary bytes (puzzle facts, full keyword arrays, image paths). Loading only metadata for play is impossible. We therefore split content into **index files** (small, loaded eagerly for lists) and **content files** (larger, loaded lazily for play).

### Index file vs content file

**Index file** (`indices/keywords.index.json`):
```json
[
  { "id": "kw-001", "domain": "geography", "keywordCount": 6, "targetLength": 7 },
  { "id": "kw-002", "domain": "science",    "keywordCount": 5, "targetLength": 6 }
]
```

- Contains only the fields needed for browsing, filtering, and schedule resolution.
- ~50–100 bytes per puzzle; a 200-puzzle index is ~15KB.
- Loaded eagerly on list pages; inlined into HTML at build time for the home page.

**Content file** (`puzzles/keywords/kw-001.json`):
```json
{
  "id": "kw-001",
  "mode": "keywords",
  "domain": "geography",
  "target": "Volcano",
  "aliases": ["volcano", "volcanoes"],
  "keywords": ["mountain", "heat", "lava", "eruption", "magma", "crater"],
  "fact": "A volcano is a rupture in the crust..."
}
```

- Contains the full puzzle payload.
- Loaded lazily only when the player opens that specific puzzle.
- Imported via dynamic `import()` in the client component, or inlined at build time for the Daily Challenge (since exactly 4 are known).

### Split by mode vs split by domain

The architecture splits **primarily by mode** at the top level (`puzzles/keywords/`, `puzzles/emoji/`, etc.), with **domain as a field** inside each puzzle. Rationale:

- **Mode is the access key for the engine.** Each mode has a distinct engine module (scoring, matching, rendering). Mode-first grouping means the engine import graph is clean: `engine/keywords.ts` consumes `data/puzzles/keywords/*`.
- **Mode is the routing key.** Routes are `/play/keywords`, `/play/emoji`, etc. (PRD §3). Mode-first folders map 1:1 to routes.
- **Domain is a filter, not a partition.** A player browsing "Geography" wants puzzles across all modes tagged `geography`. A domain-first split would scatter one mode's puzzles across many folders, making mode-specific engine loading harder. With domain as a field, the master index supports domain filtering trivially.

A **secondary domain tag** is kept on each puzzle for the topic-browser use case (PRD P2: "Browse available topics/domains"). The `master.index.json` is the union of all per-mode indices and supports `?domain=geography` queries client-side.

### Alternatives considered

1. **Split by domain first** (`puzzles/geography/`, `puzzles/science/`, ...), mode as a field.
   - **Rejected because:** The engine and routing are mode-oriented. Domain-first would force every mode's engine to scan across all domain folders. Mode-first keeps the engine import graph clean; domain remains a queryable field, which is all the topic browser needs.

2. **Single flat `puzzles/` folder** with mode in the filename.
   - **Rejected because:** 200+ files in one folder is hard to navigate and hard to grep. Mode subfolders give visual structure and let `glob` patterns target one mode.

3. **No index files; load full content and project in the browser.**
   - **Rejected because:** Shipping 200 full puzzles (~200KB+) to list pages violates PRD AC-41 (FCP < 1.5s) and AC-43 (Lighthouse ≥ 85). Index files keep list-page payloads small.

4. **Database-style normalized tables** (a `puzzles` table, a `domains` table, a `modes` table).
   - **Rejected because:** We have no database. JSON normalization without a query engine just adds indirection. The index+content split achieves the same payload optimization with plain files.

---

## 5. Daily Challenge Schedule

### Why this approach

PRD §5.1 and §6.3 require that the Daily Challenge is **deterministic from the UTC date string** (same date = same puzzles for every player) and that **no runtime computation is needed**. The PRD further specifies a `data/daily-schedule.json` file mapping date strings to puzzle IDs, pre-generated for a configurable range (e.g., 365 days).

We pre-generate the schedule at build time rather than computing it at runtime because:

- **Determinism across players** — a build artifact is identical for every visitor; runtime hashing in the browser could diverge if the puzzle pool changes between a player's morning and evening session (after a redeploy).
- **No client computation** — looking up `schedule[date]` is O(1) and instant; hashing + modulo + pool assembly in the browser adds latency and code.
- **Auditability** — a committed `daily-schedule.json` lets the content team see exactly which puzzles ship on which dates, plan diversity (no domain repeats within a week), and avoid spoiler leaks (a puzzle scheduled for tomorrow shouldn't already be live).
- **PRD R6 mitigation** — "Daily schedule runs out after 365 days" is mitigated by a CI check on the schedule's expiry date.

### Schedule generation script

`scripts/gen-schedule.ts` runs at build time (and can be run manually):

1. Reads the start date (default: today's UTC date, or the day after the current schedule's last date).
2. Reads the puzzle pool for each mode from `data/indices/*.index.json`.
3. For each date in the range (default: 365 days):
   - Computes a deterministic seed from the UTC date string: `seed = hash('2026-07-09')`.
   - For each mode, selects one puzzle: `puzzleId = pool[seed % pool.length]`, rotating the pool by the seed to avoid same-puzzle repeats across consecutive days.
   - Applies a diversity constraint: the 4 puzzles on a given day should span at least 3 distinct domains (PRD §5.1: "The domain/topic of each puzzle rotates daily to avoid repetition").
   - Writes the entry to the schedule.
4. Writes `data/daily-schedule.json`.
5. Prints the schedule's expiry date to stdout; CI checks this against a threshold (e.g., fail if expiry < 30 days away).

### UTC date handling

- All dates in the schedule are **UTC date strings** in ISO format (`YYYY-MM-DD`), never local time. This matches PRD §5.1 ("resets at UTC midnight") and §7.3 ("The UTC boundary is strict").
- The "current day" on the client is computed as `new Date().toISOString().slice(0, 10)` — this returns the UTC date regardless of the player's timezone. (PRD D7 acknowledges the device-clock limitation; we use device time because the static site has no server to provide authoritative time.)
- The schedule file's keys are UTC date strings; lookups are `schedule[utcDateString]`.

### 365-day pre-generation

- The schedule is pre-generated for **365 days from the build date** by default. This balances two concerns:
  - Too short (e.g., 30 days) → frequent rebuilds needed; PRD R6 risk realized.
  - Too long (e.g., 10 years) → if the puzzle pool grows, old schedule entries reference stale pool states and the diversity constraints can't adapt.
- 365 days gives a full year of headroom; the content team rebuilds and regenerates well before expiry.
- The schedule is **append-friendly**: `gen-schedule.ts` can extend an existing schedule by starting from the last date + 1, preserving past entries (which must never change once shipped — a player who replays yesterday's archive puzzle must see the same puzzle).

### Alternatives considered

1. **Runtime computation in the browser** (`hash(today) % poolSize`).
   - **Rejected because:** If the puzzle pool changes between two visits on the same UTC day (e.g., a content PR deploys at 18:00 UTC), a player who played at 09:00 and returns at 20:00 could see a different puzzle, breaking the "same date = same puzzles" invariant. A build artifact is immutable per deploy. Runtime hashing also can't enforce cross-day diversity constraints without scanning adjacent days, which requires the full schedule anyway.

2. **Server-side schedule endpoint** (a tiny serverless function returning today's puzzles).
   - **Rejected because:** Introduces a runtime backend, violating PRD §1 and §4.2. Adds latency, cost, and an ops surface. The schedule is small enough (< 100KB for 365 days × 4 IDs) to ship as a static file.

3. **Per-mode schedule files** (`keywords-schedule.json`, `emoji-schedule.json`, ...).
   - **Rejected because:** The Daily Challenge needs all 4 modes for a given date; a single file with all 4 IDs per date is one lookup. Four files would be four lookups and a join. The single-file approach is simpler and the diversity constraint is easier to enforce when all 4 selections are visible in one place.

4. **Infinite schedule** (generate 100 years).
   - **Rejected because:** The puzzle pool will grow over time; an infinite schedule computed against today's pool becomes stale and cannot benefit from new content. 365 days + a CI expiry check + periodic regeneration is the right balance.

---

## 6. localStorage Data Layer

### Why this approach

PRD §1, §4.1 (items 7, 8), §7.3, §7.4, and §9.6 require that **player progress, streaks, and stats persist in the browser** with no server. localStorage is the simplest persistence API that satisfies this. The architecture wraps it in a typed module (`src/storage/client.ts`) so that:

- All reads/writes go through one place — no scattered `localStorage.getItem` calls.
- Schema versioning (see §7) is enforced centrally.
- Capacity is monitored (PRD R4: target < 100KB).
- Failures (quota exceeded, private mode, disabled) are handled gracefully (see §12).

### Storage structure

A single top-level key holds the entire app state as one JSON object. This avoids key-proliferation, makes migration atomic (one object, one version), and lets us compute total size trivially.

```ts
// src/storage/keys.ts
export const STORAGE_KEY = 'gtg:state:v1';   // see §7 for versioning strategy
```

```ts
// Shape of the persisted state object
interface PersistedState {
  schemaVersion: number;            // see §7
  daily: {
    [utcDate: string]: {            // keyed by 'YYYY-MM-DD'
      kw?: { puzzleId: string; score: number; revealedKeywords: number; wrongGuesses: string[]; status: 'in_progress' | 'solved' | 'given_up' };
      em?: { ... };
      ss?: { ... };
      tl?: { ... };
      completedAt?: string;         // ISO timestamp when all 4 done
    };
  };
  streak: {
    current: number;
    max: number;
    lastActiveDate: string | null;  // UTC 'YYYY-MM-DD'
  };
  stats: {
    gamesPlayed: number;
    bestDailyScore: number;
    modeBreakdown: { keywords: number; emoji: number; screenshot: number; timeline: number };
    modeAvgScore: { keywords: number; emoji: number; screenshot: number; timeline: number };
    last30Days: { [utcDate: string]: number };   // daily final score for heatmap
  };
  settings: {
    // reserved for post-MVP (theme, reduced motion, etc.)
  };
}
```

### Key naming

- **One top-level key**: `gtg:state:v1`. The `gtg` prefix avoids collisions with other apps on the same origin; the `v1` suffix is a human-readable hint (the authoritative version is the `schemaVersion` field inside the object — see §7).
- **No scattered keys.** All sub-state lives inside the single object. This makes total-size accounting trivial (`JSON.stringify(state).length`) and prevents orphaned keys after a migration.

### Read/write wrapper

`src/storage/client.ts` exposes a small API:

```ts
// Conceptual interface (implementation in code phase)
export function loadState(): PersistedState;        // returns migrated state or fresh default
export function saveState(state: PersistedState): void;  // throws on quota, caught by caller
export function resetState(): void;                 // for "clear my data" UI
export function estimateSize(): number;             // bytes, for capacity monitoring
```

Properties of the wrapper:
- **SSR-safe**: detects `typeof window === 'undefined'` and returns a no-op or default. Next.js App Router build-time rendering must not touch localStorage.
- **Lazy migration**: on `loadState`, if `schemaVersion < CURRENT`, runs migration chain (see §7) before returning.
- **Write coalescing**: rapid state updates (e.g., typing in Keywords) are debounced so we don't write on every keystroke.
- **Quota guard**: before writing, checks `estimateSize()` against a soft limit (see below) and logs a warning; on `QuotaExceededError`, falls back to dropping the oldest `last30Days` entries first (see §12).

### Capacity control (< 100KB)

PRD R4 targets < 100KB total. The design stays well under this:

- `daily` entries: ~200 bytes each × 60 days retained = ~12KB (we prune entries older than 60 days on save; archive replay uses server-side schedule, not stored progress).
- `streak`: ~50 bytes.
- `stats.last30Days`: ~30 entries × ~30 bytes = ~1KB.
- `stats.modeBreakdown` etc.: < 200 bytes.
- Total realistic footprint: **~15–20KB**, leaving 80KB of headroom.

Pruning rules (enforced in `saveState`):
- `daily` keeps only the last 60 days (archive replay doesn't need stored progress — it replays from scratch per PRD US-21).
- `stats.last30Days` keeps exactly 30 days (PRD §7.4).
- No puzzle content is ever stored (only IDs + scores); puzzle content lives in the build, not the browser (PRD R4 mitigation).

A CI/content check logs `estimateSize()` on a worst-case fixture (60 days of daily entries + 30 days of stats) to ensure the cap holds.

### Alternatives considered

1. **IndexedDB** as primary storage.
   - **Rejected as primary** (see ADR-003 in `DECISIONS.md`): IndexedDB is async, has a complex API, over-engineered for ~20KB of structured data, and has worse browser support edge cases (private mode in some browsers). localStorage is sync, simple, and sufficient at this scale. IndexedDB is reserved for a future offline-puzzle-cache (post-MVP PWA enhancement).

2. **Many small keys** (e.g., `gtg:streak`, `gtg:stats:keywords`, `gtg:daily:2026-07-09`).
   - **Rejected because:** Multiple keys make migration non-atomic (partial migration on crash), complicate size accounting, and risk orphaned keys. A single object is simpler and safer at our scale.

3. **Cookies** for state.
   - **Rejected because:** Cookies are sent on every HTTP request (we are static, but the CDN still transacts), have a 4KB limit (we need ~20KB), and are the wrong tool for client-only state.

4. **Session storage** for daily progress + localStorage for streaks.
   - **Rejected because:** Session storage is cleared when the tab closes, which would lose daily progress on tab close (violating PRD US-6: "close tab → reopen → progress intact"). All persistent state belongs in localStorage.

---

## 7. Schema Versioning and Migration

### Why this approach

The persisted state shape will evolve (new stats fields, restructured daily entries, settings additions). Without a versioning + migration strategy, a returning player on `v1` state who loads `v2` code would either crash (missing fields) or silently lose data. We need **forward-compatible reads** and **atomic, idempotent migrations**.

### Version number field

Every persisted object carries a `schemaVersion: number` field at the top level. The codebase defines `CURRENT_SCHEMA_VERSION` (e.g., `2`). On `loadState`:

1. Read the raw object.
2. If `schemaVersion` is missing → treat as `1` (the original MVP shape).
3. If `schemaVersion === CURRENT` → return as-is.
4. If `schemaVersion < CURRENT` → run the migration chain.
5. If `schemaVersion > CURRENT` → the player is running an older build; return a safe default and discard the unknown fields (see "Forward compatibility" below).

### Migration function design

Migrations are **chained, pure functions**: `v1 → v2 → v3 → ...`. Each migration takes the previous version's shape and returns the next version's shape.

```ts
// src/storage/migrate.ts (conceptual)
const migrations: Record<number, (input: any) => any> = {
  1: (v1) => ({ ...v1, schemaVersion: 2, /* add new fields, reshape old ones */ }),
  2: (v2) => ({ ...v2, schemaVersion: 3, /* ... */ }),
};

export function migrate(raw: unknown): PersistedState {
  let state = raw;
  let version = (state as any)?.schemaVersion ?? 1;
  while (version < CURRENT_SCHEMA_VERSION) {
    state = migrations[version](state);
    version = state.schemaVersion;
  }
  return state as PersistedState;
}
```

Properties:
- **Idempotent** — running migrate twice on an already-migrated object is a no-op (the `while` loop doesn't execute).
- **Pure** — no side effects, no I/O. Easy to unit-test with fixture objects.
- **Lossless by default** — migrations preserve existing data; they reshape, add defaults, or rename fields, but never delete player data without a documented reason.
- **Testable** — each migration has a unit test: `migrate(v1Fixture).toEqual(v2Fixture)`.

### Forward compatibility

If a player loads an older build (e.g., their browser cached the JS) against newer state written by a later visit, `schemaVersion` may be `> CURRENT`. Strategy:

- The older build ignores unknown fields (it only reads fields it knows).
- It does **not** overwrite the state with its older shape (which would lose the newer fields). Instead, on `saveState`, it merges its updates into the existing object without dropping unknown top-level keys.
- This is a best-effort safety net; the primary protection is keeping the JS bundle cache fresh (the service worker handles this — PRD §4.1 item 12).

### Alternatives considered

1. **No versioning** — just read the object and hope for the best.
   - **Rejected because:** Any schema change would either crash on missing fields or silently corrupt data. Unacceptable for a streak system where players have multi-month investments.

2. **Version per key** (each top-level sub-object carries its own version).
   - **Rejected because:** Multi-key versioning multiplies the migration surface. A single top-level version is simpler and atomic. Sub-objects can still evolve within a top-level version by adding optional fields with defaults.

3. **Backend migrations** (like Rails db:migrate).
   - **Rejected because:** We have no backend. Migrations run in the player's browser on first load of a new build. They must be fast (< 5ms for our data size), pure, and incapable of bricking the app — which the chained-function design guarantees.

4. **Throw away old state on version mismatch** (nuclear option).
   - **Rejected because:** A player on a 30-day streak would lose everything on a minor schema bump. Player trust requires data preservation.

---

## 8. Search Index

### Why this approach

PRD §3 includes a topic-browser use case (P2: "Browse available topics/domains to find interesting puzzles") and the archive lets players find past challenges by date. A lightweight client-side search over puzzle metadata (target, domain, mode, keywords) supports this without a backend.

We **pre-build the search index at build time** and ship it as a static JSON file (`data/search-index.json`). The index is loaded lazily only on the browse/archive pages, not on the home or play pages.

### Client-side search approach

The index is a flat array of searchable entries:

```json
[
  { "id": "kw-001", "mode": "keywords", "domain": "geography", "text": "volcano mountain heat lava eruption magma crater", "url": "/play/keywords" },
  { "id": "em-001", "mode": "emoji",    "domain": "geography", "text": "volcano 🌋 💨 🔥", "url": "/play/emoji" },
  ...
]
```

- `text` is a pre-tokenized, lowercased concatenation of searchable fields (target + aliases + keywords/emojis + domain). Tokenizing at build time avoids runtime cost.
- The index is ~5–15KB for 200 puzzles (small enough to load on the browse page without hurting FCP).
- Search runs in the browser with **fuzzy matching via `fuse.js`** (see below).

### fuse.js vs self-built

**Decision: use `fuse.js`.**

- `fuse.js` is a ~6KB (gzipped) library with mature fuzzy matching, typo tolerance, and weighted fields. It is dependency-free (no Node built-ins), works in the browser, and is the de facto standard for client-side fuzzy search.
- A self-built index (e.g., a simple `Map<token, puzzleId[]>` with substring matching) would be smaller (~2KB) but lacks typo tolerance, which materially hurts discoverability for a casual game whose audience includes non-typists (Persona C: a 10-year-old).
- The pre-built `search-index.json` is the **input** to fuse.js; fuse.js is initialized with it lazily on the browse page.

**Why not a self-built inverted index:**
- An inverted index is the right tool for **large** corpora (thousands of documents) where fuse.js's O(n) scan would be slow. Our corpus is 200 puzzles — fuse.js scans it in < 5ms. Premature optimization.
- A self-built index adds maintenance burden (tokenizer, stemmer, ranking) for no perceivable UX gain at this scale.

**Why not a full-text search service** (Algolia, Meilisearch, Elastic):
- All require a runtime backend or a third-party API call, violating PRD §1 and §4.2. They also add cost and a network dependency for a feature that works fine on a 15KB static index.

### Alternatives considered

1. **Self-built inverted index with exact substring match.**
   - **Rejected because:** No typo tolerance; smaller payload but worse UX. Justified only at > 1000 puzzles, which is post-MVP.

2. **Algolia / Meilisearch / Elastic Search.**
   - **Rejected because:** Runtime backend or third-party API; violates the static-site constraint; adds cost and latency.

3. **No search; pure filter UI** (dropdowns for mode + domain).
   - **Rejected because:** Filter UIs work for structured browsing but not for "I remember a puzzle about a volcano" discovery. Search complements filters; both are cheap.

4. **Build-time generated search page** (one HTML page per query).
   - **Rejected because:** Infinite query space; cannot pre-generate. Search must be interactive, hence client-side.

---

## 9. Game Engine and UI Separation

### Why this approach

PRD §9 includes many unit-testable acceptance criteria (AC-9, AC-10, AC-13, AC-17, AC-23, AC-27, AC-29, AC-30, AC-33). These are **pure logic** — scoring formulas, guess matching, position-error calculation, streak math. They have no UI. If scoring logic lives inside a React component, it becomes hard to unit-test (requires rendering the component, mocking hooks, etc.) and impossible to reuse across components (Daily Challenge card, stats page, share card all need scores).

The engine is therefore a **pure-function module** with **zero React/Next/DOM dependencies**. It takes data in, returns results out. It is independently testable in Node without jsdom.

### Pure function engine

The engine exposes functions like:

```ts
// engine/scoring.ts
export function scoreKeywords(revealed: number, wrongGuesses: number, gaveUp: boolean): number;
export function scoreEmoji(wrong: number, hints: number, gaveUp: boolean): number;
export function scoreScreenshot(wrong: number, sharpens: number, gaveUp: boolean): number;
export function scoreTimeline(positionErrors: number, hints: number, gaveUp: boolean): number;

// engine/match.ts
export function matchGuess(guess: string, target: string, aliases: string[]): boolean;

// engine/streak.ts
export function streakMultiplier(currentStreak: number): number;   // PRD §7.2 table
export function advanceStreak(prev: StreakState, todayUtc: string): StreakState;

// engine/shuffle.ts
export function seededShuffle<T>(items: T[], seed: string): T[];   // deterministic for Timeline + daily

// engine/schedule.ts
export function resolveDaily(schedule: DailySchedule, utcDate: string): DailyPuzzles;

// engine/share.ts
export function buildShareText(result: DailyResult): string;       // PRD AC-7
```

Each function:
- Is a **pure function** — same inputs → same outputs, no side effects.
- Has **no React imports**, no `useState`, no JSX.
- Has **no DOM access** — no `window`, `document`, `localStorage`.
- Is **isomorphic** — runs identically in Node (tests, build scripts) and the browser (client components).

### No React dependency

The engine module (`src/engine/`) has `"react"` and `"next"` in its ESLint `no-restricted-imports` list. CI runs engine unit tests in pure Node (no jsdom) to prove no DOM/React coupling. This means:
- Engine tests are fast (no React render setup).
- Engine can be extracted to a separate package later (e.g., for a React Native port) with zero changes.
- Engine logic can be invoked from build-time scripts (e.g., pre-computing a share card preview for OG images).

### Independently testable

Engine tests (`src/engine/__tests__/`) cover every PRD scoring AC directly:

- `scoreKeywords(2, 1, false)` → `100 - 15*2 - 10*1 = 60` (AC-13).
- `matchGuess("everest", "Mount Everest", ["mount everest", "everest"])` → `true` (AC-10).
- `scoreTimeline(3, 0, false)` → `100 - 15*3 = 55` (AC-29, mirroring PRD §5.5 example).
- `streakMultiplier(7)` → `1.20` (AC-30).

These tests run in milliseconds, give precise failure messages, and never touch the DOM.

### Alternatives considered

1. **Logic inside React components** (e.g., `useScore` hook that computes inside the component).
   - **Rejected because:** Untestable in isolation — testing the hook requires rendering a component with React Testing Library, which is slower and conflates UI bugs with logic bugs. Logic reuse across components (Daily card, stats, share) requires duplicating or extracting anyway; extracting to a pure module is the clean answer.

2. **Class-based engine** (a `Game` class holding state).
   - **Rejected because:** Classes introduce mutable state and lifecycle, which complicates testing (each test must construct a fresh instance) and reasoning. Pure functions are easier to test, parallelize, and reason about. State belongs in React (the UI layer) or localStorage (the persistence layer), not the engine.

3. **State machine library** (XState) for game flow.
   - **Rejected because:** Each mode's flow is simple (input → match → score → lock). A full state machine library is overkill for 4 short flows. Post-MVP, if flows grow (e.g., tutorial overlays, difficulty selection), XState can be revisited.

4. **Engine as a Web Worker** (off-main-thread logic).
   - **Rejected because:** Our engine functions complete in microseconds. Worker communication overhead exceeds the compute. Workers are justified for heavy compute (e.g., image processing), which we don't have.

---

## 10. Static Generation of Dynamic Routes

### Why this approach

PRD §3 defines two dynamic route patterns:
- `/play/[mode]` — 4 modes: `keywords`, `emoji`, `screenshot`, `timeline`.
- `/archive/[date]` — one page per past daily challenge (up to 365 dates from the schedule).

With `output: 'export'`, Next.js cannot render dynamic routes at request time. Every dynamic segment must be enumerated at build time via `generateStaticParams`. This is a hard requirement, not a choice — but it aligns perfectly with our static-site goal.

### `generateStaticParams` for `/play/[mode]`

```ts
// src/ui/app/play/[mode]/page.tsx (conceptual)
export function generateStaticParams() {
  return [
    { mode: 'keywords' },
    { mode: 'emoji' },
    { mode: 'screenshot' },
    { mode: 'timeline' },
  ];
}
```

- 4 modes → 4 pre-rendered HTML pages.
- The page reads the mode, loads the corresponding puzzle pool index, and renders a "play a random puzzle from this mode" UI. The actual puzzle is selected client-side (random or topic-filtered) so the page is interactive without a server.
- For the Daily Challenge, the home page and `/daily` page read `daily-schedule.json` at build time and inline today's 4 puzzle IDs into the HTML.

### `generateStaticParams` for `/archive/[date]`

```ts
// src/ui/app/archive/[date]/page.tsx (conceptual)
export function generateStaticParams() {
  const schedule = require('@/data/daily-schedule.json');
  return Object.keys(schedule).map((date) => ({ date }));
}
```

- One HTML page per date in the schedule (up to 365).
- Each page pre-renders with that date's 4 puzzle IDs inlined, so the archive page is fully static and loads instantly.
- The archive list page (`/archive`) pre-renders a list of all dates with their domain summary.

### Tradeoffs

- **Build time**: 365 archive pages + 4 play pages + ~6 static pages ≈ 375 pages. Next.js handles this in well under a minute on a modern CI runner.
- **Bundle size**: each archive page is small (the puzzle content is fetched lazily when the player actually replays; the HTML only inlines IDs and metadata).
- **Schedule growth**: if the schedule extends to 730 days, build time grows linearly but remains acceptable. The 365-day default keeps builds fast.

### Alternatives considered

1. **Single catch-all page that reads the date/mode from the URL at runtime.**
   - **Rejected because:** Static export requires pre-rendered pages; a catch-all without `generateStaticParams` produces a 404 on static hosts. (Next.js can do this with `dynamicParams = false` + a fallback, but the fallback requires a server, which we don't have.)

2. **Generate archive pages on-demand via a serverless function.**
   - **Rejected because:** Introduces a runtime backend, violating PRD §1. Also unnecessary — 365 static pages are cheap to build and host.

3. **Don't pre-generate `/archive/[date]`; only generate `/archive` with client-side routing.**
   - **Rejected because:** Direct links to a specific archive date (e.g., shared in a group chat) would 404 on a static host. Pre-generating each date gives every archive puzzle a real, shareable URL — important for the social-sharing use case (PRD US-19, US-20).

4. **Limit archive to recent N days** (e.g., last 30).
   - **Rejected because:** PRD §4.1 item 10 says "Browse and replay past daily challenges" without a recency limit. Players who join late (PRD Persona C, weekend player) may want to catch up on months of puzzles. 365 days covers a full year; the schedule regenerates annually.

---

## 11. Image Processing

### Why this approach

Screenshot mode (PRD §5.4) and OG share images (PRD D5) require images. The constraints are strict:
- **Public-domain or original illustrations only** (PRD §5.4, AC-21) — no copyrighted game screenshots.
- **Attribution metadata required** where the license demands it (PRD AC-22).
- **Fast load** (PRD AC-41: FCP < 1.5s) — images must be small.
- **Progressive blur** — images start at blur level 3 and sharpen in 3 steps (PRD §5.4).

### WebP format

All puzzle images are **WebP** at build time.

- WebP offers 25–35% smaller files than JPEG at equivalent visual quality, and supports transparency (needed for silhouettes) unlike baseline JPEG.
- Browser support is universal (Chrome, Edge, Firefox, Safari 16+). For Safari < 16 (now < 1% of traffic globally), we accept the minor degradation — a fallback JPEG is not worth the dual-asset maintenance for a sub-1% segment. (See §12 for the fallback strategy.)
- PNG is retained only for tiny silhouettes where transparency + sharp edges matter and the file is already < 5KB.

### Blur implementation: CSS filter vs pre-generated multi-resolution

**Decision: CSS `filter: blur()` with discrete levels.**

The Screenshot mode blur is implemented client-side with CSS:
- `blur-level-3` → `filter: blur(20px) brightness(0.8)`
- `blur-level-2` → `filter: blur(12px)`
- `blur-level-1` → `filter: blur(6px)`
- `blur-level-0` → `filter: none`

Sharpening transitions the CSS class, with a CSS transition for the visual effect.

**Why CSS filter over pre-generated multi-resolution images:**

- **Asset count**: pre-generating 4 blur levels per image × 200 images = 800 image files. CSS filter uses 1 image per puzzle.
- **Build complexity**: a pre-gen pipeline must run an image processor (sharp) at 4 levels per image, manage 4 file paths per puzzle, and update the schema to reference 4 URLs. CSS filter needs none of this.
- **Visual quality**: CSS `blur()` is GPU-accelerated and visually indistinguishable from a pre-blurred image at these levels. The slight "halo" at blur-3 is acceptable for a guessing game (it's supposed to be hard to see).
- **Bandwidth**: CSS filter loads one image (the full-resolution WebP, ~30–60KB). Pre-gen would load a small blurred image first (good for FCP) but requires a second fetch on sharpen (bad for perceived speed). CSS filter loads once and transitions instantly.
- **Simpler schema**: the puzzle JSON references one image path (`image: "/images/puzzles/ss-001.webp"`), matching PRD §6.1.

**Tradeoff acknowledged**: the full-resolution image is loaded even at blur level 3, which means the answer is technically in the browser's cache and could be inspected by a determined cheater (e.g., removing the CSS filter via devtools). This is acceptable because:
- The game is single-player with no prizes; cheating gains nothing.
- A pre-gen pipeline doesn't fully solve this either (a cheater can fetch the unblurred asset directly if it exists on the CDN).
- The PRD doesn't list anti-cheat as a requirement.

### Public-domain image pipeline

The image sourcing pipeline (manual + scripted):

1. **Source selection** — content editor picks from:
   - Wikimedia Commons (public domain or CC0).
   - NASA Image Library (public domain).
   - NOAA Photo Library (public domain).
   - Original illustrations commissioned or drawn by the team.
   - Generated silhouettes (SVG → WebP) as a fallback for any subject without a suitable photo.
2. **License verification** — the editor records the license and attribution in the puzzle JSON (`imageLicense`, `imageAttribution` per PRD §6.1). The `audit-content.ts` script (see §13) fails the build if either field is missing or if the license is not in an allowlist (`public-domain`, `cc0`, `cc-by` with attribution).
3. **Processing** — a script (`scripts/process-images.ts`) converts source images to WebP at a target size (e.g., 800×600, quality 78), strips EXIF (privacy + size), and writes to `public/images/puzzles/{puzzle-id}.webp`.
4. **Audit** — `audit-content.ts` verifies every screenshot puzzle has a corresponding WebP file, the file is under a size cap (e.g., 80KB), and the attribution field is non-empty.

### Alternatives considered

1. **Pre-generated multi-resolution blur images** (4 WebP files per puzzle at blur 3/2/1/0).
   - **Rejected because:** 4× asset count, 4× build processing, 4× schema complexity, and a second network fetch on each sharpen. CSS filter achieves the same visual effect with one asset. (See ADR-005 in `DECISIONS.md`.)

2. **JPEG instead of WebP.**
   - **Rejected because:** 25–35% larger files for the same quality, no transparency for silhouettes. (See ADR-007.)

3. **AVIF instead of WebP.**
   - **Rejected because:** AVIF encoding is 5–10× slower than WebP at build time, and decoder support is less universal (Safari < 16.4). The size win (~20% over WebP) doesn't justify the build-time cost and compat risk for a small image corpus. Revisit when AVIF encoding is faster and Safari share of old versions drops.

4. **SVG for all images.**
   - **Rejected because:** SVG is great for silhouettes and illustrations but cannot represent photographs (the bulk of Screenshot mode content). A photo of Mount Everest cannot be meaningfully SVG-encoded.

5. **Canvas-based blur at runtime** (draw image to canvas, apply blur shader).
   - **Rejected because:** More complex than CSS filter, requires canvas support, and offers no visual advantage. CSS filter is the simplest sufficient solution.

---

## 12. Error Handling

### Why this approach

A static site with no backend has limited recovery options when things go wrong. The architecture must degrade gracefully on four failure classes: missing data, image load failure, localStorage unavailable, and browser incompatibility. Each has a defined fallback so the app never shows a blank screen or a silent crash.

### Data missing (puzzle JSON not found or invalid)

- **At build time**: the `audit-content.ts` script (see §13) validates every puzzle file against the Zod schema. A missing file, a missing required field, or a type mismatch **fails the build**. This catches 99% of data issues before they reach a player.
- **At runtime** (rare — e.g., a schedule entry references a puzzle ID that was deleted in a later build): the engine's `resolveDaily` function returns a `Result` type (`{ ok: true, puzzles } | { ok: false, reason }`). The UI shows a friendly "This puzzle is unavailable, try tomorrow's" message and logs the missing ID to the console for the dev team.
- **Stale schedule**: if `daily-schedule.json` has no entry for today's date (schedule expired — PRD R6), the UI shows a "Schedule is being refreshed" message and falls back to a random puzzle from the pool so the player isn't blocked.

### Image load failure

- Every `<img>` has an `onError` handler that swaps `src` to a placeholder silhouette (`/images/puzzles/placeholder.webp`) and sets a `data-fallback` attribute.
- The placeholder is a generic silhouette (e.g., a question mark) so the game remains playable — the player can still guess from the fact/keywords.
- Attribution metadata is still shown even on fallback (license compliance).
- The error is logged to the console with the failed URL for debugging.

### localStorage unavailable

Causes: private/incognito mode in some browsers, disabled via browser settings, storage quota exceeded, browser too old to support the API.

- `loadState()` wraps `localStorage.getItem` in try/catch. On failure, it returns a fresh default state and sets an in-memory flag `storageAvailable = false`.
- `saveState()` checks the flag; if storage is unavailable, it silently no-ops (the player can still play the current session; progress just won't persist).
- The Stats page detects `storageAvailable === false` and shows a banner: "Your browser is blocking local storage. Progress won't be saved between sessions."
- On `QuotaExceededError` specifically, `saveState()` prunes the oldest `daily` entries and retries once; if it still fails, it drops `stats.last30Days` and retries; if it still fails, it gives up and shows the banner.

### Browser compatibility degradation

- **Baseline support**: ES2020, CSS Grid, Flexbox, `fetch`, `localStorage`, `Web Share API` (with clipboard fallback), WebP.
- **Progressive enhancement**: features that aren't universal degrade gracefully:
  - **Web Share API** — if `navigator.share` is undefined, the Share button falls back to `navigator.clipboard.writeText` (PRD AC-7), which itself falls back to a "select-all-and-copy" prompt on older browsers.
  - **Drag-and-drop** (Timeline) — if the HTML5 DnD API is unavailable or touch-unfriendly, the Move Up/Down buttons are always present as the primary alternative (PRD AC-26, AC-37).
  - **Service Worker / PWA install** — if `serviceWorker` is unsupported, the site works as a normal website; only offline play and installability are lost (PRD §4.1 item 12 is a P1, not P0).
  - **Emoji rendering** — if an emoji renders as tofu (□), the hint system (PRD §5.3: category + first letter) provides a text path to the answer. The content team avoids newly-added emojis (PRD R5 mitigation).
- **CSS `filter: blur()`** — universally supported; no fallback needed. If a browser somehow lacks it, the image displays unblurred (cheating risk only, not a correctness issue).
- **Feature detection** via `typeof`/`in` checks, not user-agent sniffing.

### Alternatives considered

1. **Crash loudly on any error** (fail fast).
   - **Rejected because:** A casual game audience (Persona A on a commute) will abandon the site on the first blank screen, not file a bug report. Graceful degradation preserves the session and the player.

2. **Send errors to a backend error tracker** (Sentry).
   - **Rejected for MVP because:** Adds a runtime backend dependency and a third-party script. Post-MVP, a lightweight error beacon (e.g., to a serverless endpoint) can be added. For MVP, console logs + the service worker cache of the last-known-good build suffice.

3. **Block old browsers entirely** with an "upgrade your browser" page.
   - **Rejected because:** Excludes real users (Persona C on an older tablet) for little benefit. Progressive enhancement is more inclusive and barely more work.

---

## 13. Testing Layers

### Why this approach

PRD §9 defines 45 acceptance criteria spanning pure logic (AC-9, AC-13, AC-17, AC-23, AC-27, AC-29, AC-30, AC-33), UI flows (AC-2, AC-3, AC-4, AC-7, AC-11, AC-12, AC-14), accessibility (AC-35–40), and performance (AC-41–45). No single test layer covers all of these efficiently. A four-layer strategy matches each criterion to the cheapest sufficient layer.

### Layer 1: Unit tests (engine functions)

- **Tool**: Vitest (or Jest — either is fine; Vitest integrates with Vite if used).
- **Scope**: every function in `src/engine/` and `src/storage/migrate.ts`.
- **Runs in**: pure Node (no jsdom) — proves engine has no DOM coupling.
- **Speed**: thousands of tests in < 1s.
- **Covers ACs**: AC-9, AC-10, AC-13, AC-17, AC-23, AC-27, AC-29, AC-30, AC-33 (all the scoring/matching/streak criteria).
- **Example**: `expect(scoreKeywords(2, 1, false)).toBe(60)` (mirrors PRD §5.2 example).

### Layer 2: Integration tests (engine + data)

- **Tool**: Vitest.
- **Scope**: engine functions fed real puzzle JSON from `src/data/puzzles/`. Verifies that the schema matches what the engine expects, and that every puzzle is solvable (e.g., a Keywords puzzle's `target` matches at least one of its `keywords` in spirit; a Timeline puzzle's items have strictly increasing dates).
- **Runs in**: Node, reading JSON files directly.
- **Covers ACs**: AC-21, AC-22 (content audit), and implicit correctness (no puzzle ships that crashes the engine).
- **Also includes**: the content validation script (below).

### Layer 3: End-to-end tests (Playwright)

- **Tool**: Playwright.
- **Scope**: full user flows against a production build served locally.
- **Runs in**: headless Chromium (and optionally WebKit + Firefox for cross-browser).
- **Covers ACs**: AC-1, AC-2, AC-3, AC-4, AC-5, AC-6, AC-7, AC-8, AC-11, AC-12, AC-14, AC-15, AC-16, AC-18, AC-19, AC-20, AC-24, AC-25, AC-26, AC-28, AC-31, AC-32, AC-34, AC-37 (all UI-flow criteria).
- **Examples**:
  - Load home → tap Daily → solve 1 puzzle → return to daily → card shows score (AC-3).
  - Mock UTC date change → new puzzles appear (AC-6).
  - Click Share → clipboard contains score summary (AC-7).
  - Drag Timeline item → order changes (AC-25).
- **Mocking**: `localStorage` is cleared between tests; the clock is mocked via Playwright's context clock API for date-boundary tests.

### Layer 4: Content validation script

- **Tool**: a standalone Node script (`scripts/audit-content.ts`) invoked in CI.
- **Scope**: every puzzle JSON + every image asset.
- **Checks**:
  - Schema validity (Zod parse) for every puzzle file.
  - Every screenshot puzzle has a corresponding `.webp` file in `public/images/puzzles/`.
  - Every image file is under the size cap (e.g., 80KB).
  - Every screenshot puzzle has non-empty `imageLicense` and `imageAttribution` (PRD AC-22).
  - License is in the allowlist (`public-domain`, `cc0`, `cc-by`) (PRD AC-21).
  - No duplicate puzzle IDs across the corpus.
  - No duplicate (target, mode) pairs (avoid two "Volcano" keyword puzzles).
  - Schedule references valid puzzle IDs.
  - Schedule's last date is > 30 days from build date (PRD R6).
- **Covers ACs**: AC-21, AC-22 directly; prevents whole classes of runtime errors.

### Accessibility and performance testing

- **Accessibility**: `axe-core` integrated into Playwright tests; every game page must pass with zero critical violations (PRD AC-38, AC-44). Manual NVDA/VoiceOver smoke test before each release (PRD AC-40).
- **Performance**: Lighthouse CI runs against the production build; thresholds enforce PRD AC-41 (FCP < 1.5s), AC-42 (TTI < 2s), AC-43 (Perf ≥ 85), AC-44 (A11y ≥ 95), AC-45 (PWA installable).

### Alternatives considered

1. **Only E2E tests** (skip unit/integration).
   - **Rejected because:** E2E tests are slow (seconds per test vs milliseconds for unit), flakier, and give worse failure messages. Testing all 9 scoring edge cases via E2E would take minutes and conflate logic bugs with UI bugs. Unit tests are the right tool for pure logic.

2. **Only unit tests** (skip E2E).
   - **Rejected because:** Unit tests can't verify that clicking "Share" actually copies to the clipboard, or that drag-and-drop reorders items. PRD AC-7, AC-25, AC-26 require real browser interaction.

3. **Cypress instead of Playwright.**
   - **Rejected because:** Playwright has better cross-browser support out of the box (Chromium, WebKit, Firefox), faster execution, and a more modern API. Cypress is fine but single-browser by default. Either works; Playwright is the current best-in-class.

4. **Manual QA only.**
   - **Rejected because:** 45 ACs × manual checks per release is error-prone and slow. Automated tests catch regressions that humans miss.

---

## 14. Build and Deployment Pipeline

### Why this approach

PRD §1 requires "hosting costs near zero" and PRD AC-41–45 require fast load and PWA installability. A static build deployed to a CDN-edge host (Vercel or Cloudflare Pages) satisfies both. The pipeline must be fully automated and gated by CI checks so that content additions (JSON PRs) can be merged and deployed by non-developers.

### Build flow

```
content PR (JSON) → CI checks → merge to main → build → static export → deploy to CDN
```

**Build steps** (`next build`):

1. **Content audit** — `scripts/audit-content.ts` validates all puzzle JSON, images, schedule, and search index. Fails build on any violation.
2. **Schedule check** — verify `daily-schedule.json` covers ≥ 30 days forward; fail build if expired (PRD R6).
3. **Search index generation** — `scripts/gen-search-index.ts` reads all puzzle indices and writes `data/search-index.json` (if stale).
4. **Next.js build** — `next build` with `output: 'export'`:
   - Runs `generateStaticParams` for `/play/[mode]` (4 pages) and `/archive/[date]` (up to 365 pages).
   - Inlines today's Daily Challenge puzzle IDs into the home page HTML.
   - Produces `out/` directory with static HTML, CSS, JS, and assets.
5. **Post-build verification** — Lighthouse CI runs against the `out/` directory (served locally); thresholds enforce PRD AC-41–45.

### Static export output

The `out/` directory contains:
- `index.html`, `daily/index.html`, `play/keywords/index.html`, ..., `archive/index.html`, `archive/2026-07-09/index.html`, ...
- `_next/static/` — JS/CSS chunks with content hashes for long-term caching.
- `images/puzzles/*.webp` — puzzle images.
- `manifest.webmanifest` — PWA manifest.
- `sw.js` — service worker for offline play.
- `data/daily-schedule.json`, `data/search-index.json` — copied to `out/data/` for client fetches (or inlined where appropriate).

### Deployment

**Primary target: Vercel** (or Cloudflare Pages — both are equivalent for static output).

- Vercel: connect the Git repo; set build command `next build` (Vercel auto-detects `output: 'export'`); output directory `out`. Deploys on every push to `main`.
- Cloudflare Pages: build command `npm run build && next build`; output directory `out`. Same flow.
- Both provide: global CDN, automatic HTTPS, immutable asset caching, preview deployments on PRs.

**No server-side runtime** is configured — the deployment is purely static files on a CDN. This is the core architectural commitment.

### CI checks (gate on merge to main)

| Check | Tool | Gate |
|---|---|---|
| TypeScript typecheck | `tsc --noEmit` | Must pass |
| ESLint (incl. import boundaries) | `next lint` | Must pass |
| Unit tests | Vitest | Must pass |
| Integration tests | Vitest | Must pass |
| Content audit | `scripts/audit-content.ts` | Must pass |
| Schedule freshness | Script | Expiry > 30 days |
| E2E tests | Playwright | Must pass |
| Accessibility | axe-core in Playwright | Zero critical violations |
| Performance | Lighthouse CI | FCP < 1.5s, TTI < 2s, Perf ≥ 85 |
| Bundle size | `@next/bundle-analyzer` or size-limit | Home page JS < 150KB gzipped |

### Alternatives considered

1. **Server-side rendering on Vercel** (drop `output: 'export'`).
   - **Rejected because:** PRD mandates no runtime backend. SSR would introduce serverless functions, cost, and cold-start latency — all contrary to the product constraints. Static export is the explicit choice.

2. **Self-hosted on a VPS** (Nginx + CDN).
   - **Rejected because:** Adds ops burden (server maintenance, TLS renewal, caching config) for zero benefit over a managed CDN. Vercel/Cloudflare Pages do this better for free.

3. **GitHub Pages**.
   - **Acceptable but secondary.** GitHub Pages is free and fine for static output, but lacks preview deployments on PRs and has a 1GB site size limit (we're well under). Vercel/Cloudflare are preferred for DX; GitHub Pages is a viable fallback.

4. **No CI; build and deploy manually.**
   - **Rejected because:** Content PRs (JSON additions) should be mergeable by non-developers with confidence. Without CI gates, a malformed puzzle could ship to production and break the build or a player's session. CI is the safety net that enables the content workflow.

---

## 15. POC Verification Checklist

The following are quick technical validations to run **before** committing to the full build. Each can be verified in under an hour with a throwaway script or config; none require writing production code.

### POC-1: Next.js static export produces a working static build

- **Verify**: create a minimal Next.js app with `output: 'export'`, one static page, one `/play/[mode]` page with `generateStaticParams` returning 4 modes. Run `next build`. Confirm `out/` directory contains `play/keywords/index.html` etc. Serve `out/` with `npx serve` and confirm all pages load with no server.
- **Pass criterion**: every route returns 200 from a static file server; no 404s; no runtime errors.

### POC-2: Engine runs in pure Node with no DOM

- **Verify**: write `engine/scoring.ts` with `scoreKeywords`. Write a Vitest test that imports and calls it in a Node environment (no jsdom). Confirm the test passes and that adding a `window` reference to the engine causes the ESLint `no-restricted-globals` rule to fail.
- **Pass criterion**: engine test runs in < 100ms; ESLint blocks DOM globals in `engine/`.

### POC-3: localStorage wrapper survives SSR

- **Verify**: in a Next.js App Router page (Server Component), call `loadState()`. Confirm it returns a default without throwing (because `typeof window === 'undefined'`). Then call it in a Client Component and confirm it reads actual localStorage.
- **Pass criterion**: no hydration mismatch errors in the browser console; SSR build succeeds.

### POC-4: Schema migration chain is idempotent

- **Verify**: write `migrate` with two migrations (v1→v2, v2→v3). Write a fixture for v1. Confirm `migrate(v1Fixture)` yields v3 shape. Confirm `migrate(migrate(v1Fixture))` yields the same v3 shape (idempotent). Confirm `migrate(v3Fixture)` (already current) returns unchanged.
- **Pass criterion**: all three assertions pass.

### POC-5: CSS filter blur is visually equivalent to pre-blurred image

- **Verify**: take a sample WebP. Display it at blur(20px), blur(12px), blur(6px), none in a browser. Compare visually to a pre-blurred version (if desired, generate via sharp). Confirm the CSS version is indistinguishable at the game's display size.
- **Pass criterion**: visual inspection confirms CSS blur is sufficient; no double-asset pipeline needed.

### POC-6: WebP size vs JPEG

- **Verify**: take 5 sample photos. Convert each to WebP (q=78, 800×600) and JPEG (q=78, 800×600). Compare file sizes. Confirm WebP is ≥ 25% smaller at equivalent visual quality.
- **Pass criterion**: WebP wins on size for all 5 samples.

### POC-7: fuse.js search over 200 puzzles is fast

- **Verify**: generate a 200-entry `search-index.json` fixture. Initialize fuse.js in a browser. Type "volcano" and measure time to results.
- **Pass criterion**: results return in < 10ms; index loads in < 50ms.

### POC-8: generateStaticParams handles 365 archive pages

- **Verify**: generate a 365-entry `daily-schedule.json` fixture. Run `next build` with `/archive/[date]` using `generateStaticParams`. Measure build time and output size.
- **Pass criterion**: build completes in < 90s; `out/archive/` contains 365 directories; each `index.html` is < 20KB.

### POC-9: localStorage capacity under worst-case state

- **Verify**: construct a `PersistedState` fixture with 60 days of daily entries + 30 days of stats. `JSON.stringify` and measure byte length.
- **Pass criterion**: total < 30KB (well under the 100KB target).

### POC-10: Public-domain image pipeline produces valid WebP with attribution

- **Verify**: download one public-domain image from Wikimedia Commons, run it through `scripts/process-images.ts`, confirm the output WebP is < 80KB, strips EXIF, and the puzzle JSON has `imageLicense` + `imageAttribution` populated.
- **Pass criterion**: all four assertions pass; `audit-content.ts` accepts the puzzle.

### POC-11: Web Share API fallback chain

- **Verify**: in a browser without `navigator.share`, click Share. Confirm `navigator.clipboard.writeText` is called. In a browser without both, confirm a manual copy prompt appears.
- **Pass criterion**: all three paths produce a copyable result string.

### POC-12: Deterministic daily schedule

- **Verify**: run `gen-schedule.ts` twice with the same start date and pool. Confirm the output is byte-identical. Change one puzzle in the pool and confirm only affected dates change.
- **Pass criterion**: determinism holds; changes are scoped.

---

## 16. When to Migrate to a Database

PRD §10.3 defines four triggers that would justify introducing a database / runtime backend. Until any is met, the static + localStorage architecture is superior. This section specifies the **technical migration path** for each trigger, so the team can recognize the trigger and execute confidently when the time comes.

### Trigger 1: Social features (leaderboards, friends, community averages)

**Signal**: players consistently request score comparison (PRD R7, §10.3 item 1). The "personal stats only" framing in MVP no longer satisfies retention.

**Migration path**:
1. Introduce a **serverless function layer** (Vercel Functions or Cloudflare Workers) — minimal, no full backend.
2. Add an **anonymous identity**: on first visit, the client generates a UUID stored in localStorage; this becomes the player's anonymous ID. No email, no OAuth (preserves PRD §4.2's "no accounts" spirit as long as possible).
3. Add a **scores table** (Postgres on Neon/Supabase, or DynamoDB): `{ playerId, utcDate, dailyTotal, multiplier, finalScore, modeBreakdown }`.
4. Add a **submission endpoint** `POST /api/scores` called after Daily Challenge completion.
5. Add a **leaderboard endpoint** `GET /api/leaderboard?date=...` returning top-N + community average.
6. The static site remains the primary surface; the API is a progressive enhancement. Players who block the API still get the full game with personal stats.
7. **Migration of existing data**: offer an opt-in "upload my history" button that reads localStorage and POSTs historical daily scores to the backend, keyed by the new anonymous ID.

**Architecture impact**: engine and UI layers unchanged. A new `api/` layer is added. localStorage remains the source of truth for in-progress state; the backend is the source of truth for completed-daily scores.

### Trigger 2: Cross-device sync

**Signal**: players want their streak and stats to follow them across phone and desktop (PRD §10.3 item 2).

**Migration path**:
1. Reuse the anonymous identity from Trigger 1, but add a **device-pairing flow**: the player visits `/pair` on device A, gets a short-lived code, enters it on device B. Device B adopts device A's anonymous ID.
2. Add a **state sync table**: `{ playerId, stateJson, updatedAt }`. The full `PersistedState` object is uploaded after each `saveState` (debounced).
3. On load, the client fetches the latest state from the backend and merges with local state using a **last-write-wins per field** strategy (or a more nuanced CRDT if conflicts arise — unlikely at our write frequency).
4. Streak integrity: the backend validates streak claims against submission timestamps to prevent clock-manipulation cheating.

**Architecture impact**: `storage/client.ts` gains a sync wrapper; the rest of the app is unaware. This is the cleanest migration because the storage abstraction already exists.

### Trigger 3: User-generated content

**Signal**: players want to create and share custom puzzles (PRD §10.3 item 3).

**Migration path**:
1. Add a **puzzles table**: `{ puzzleId, authorId, mode, domain, content, status, createdAt }` where `status` is `pending | approved | rejected`.
2. Add a **moderation queue**: either manual review by the content team or a community flagging system. UGC cannot ship unmoderated (IP, quality, safety).
3. Add authoring endpoints: `POST /api/puzzles` (submit), `GET /api/puzzles/:id` (fetch).
4. The static site's curated puzzles remain the default; UGC is opt-in via a "Community Puzzles" section.
5. The build pipeline gains a step that pulls approved UGC into the static bundle on each rebuild (hybrid: curated at build, UGC at runtime, or all UGC at runtime via API).

**Architecture impact**: significant. The content model gains a runtime source; the engine must handle both static and dynamic puzzle JSON. The `data/` layer abstraction (already in place) makes this manageable — swap the static import for an API fetch behind the same interface.

### Trigger 4: Dynamic content updates without rebuild

**Signal**: the content team wants to add or fix puzzles without waiting for a full build+deploy (PRD §10.3 item 4).

**Migration path**:
1. Move puzzle JSON from `src/data/puzzles/` to a **content store** (a Git repo used as a CMS, or a headless CMS like Sanity, or a Postgres table).
2. Add a **content API** `GET /api/puzzles/:id` and `GET /api/schedule/:date`.
3. The static site fetches puzzle content at runtime (with a static fallback bundle for offline/PWA).
4. The build still pre-generates route shells, but puzzle content is hydrated client-side from the API.
5. Schedule generation moves to a backend job or runs on content-change webhooks.

**Architecture impact**: the build becomes thinner (route shells only); content moves behind an API. The `data/` layer's interface (already abstracted) shields the engine from this change.

### Cross-cutting migration principles

- **The three-layer separation (engine / data / UI) is the migration's greatest asset.** Each trigger's migration touches at most one layer's internals; the others observe no change. This is the architectural payoff of §2 and §9.
- **No big-bang rewrite.** Each trigger is independently shippable. The static site remains the primary surface; backend features are progressive enhancements layered on top.
- **localStorage is never removed.** Even with a backend, localStorage remains the in-progress state store and the offline cache. The backend is the sync/aggregate layer.
- **Reassess quarterly** (PRD D8). If after 3 months of usage data no trigger has fired, the static architecture is validated and the team should resist premature backend adoption.

### Explicit non-trigger (do not migrate for these)

- **"We might want leaderboards someday"** — not a trigger until players actually ask (PRD R7).
- **"A database would be more 'professional'"** — not a technical reason.
- **"We want to add accounts"** — explicitly out of scope (PRD §4.2) unless cross-device sync demands it.
- **"The content team finds JSON PRs annoying"** — solve with tooling (a content editor web UI that commits JSON via the GitHub API), not a database.

---

*End of architecture document. For per-decision rationale, see [`DECISIONS.md`](./DECISIONS.md). For product requirements, see [`PRD.md`](./PRD.md).*
