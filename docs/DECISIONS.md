# Architecture Decision Records — Guess the Game

> Companion to [`architecture.md`](./architecture.md) and [`PRD.md`](./PRD.md).
>
> This file records the significant, cross-cutting architectural decisions for the Guess the Game MVP. Each ADR follows the format: **Title · Status · Context · Decision · Alternatives · Rejected because · Consequences**.
>
> Created: 2026-07-09 · Status legend: `Proposed` · `Accepted` · `Superseded by ADR-XXX` · `Deprecated`

---

## Index

| ADR | Title | Status |
|-----|-------|--------|
| [ADR-001](#adr-001-nextjs-app-router-static-export-rather-than-astro--gatsby) | Next.js App Router static export rather than Astro / Gatsby | Accepted |
| [ADR-002](#adr-002-engine--ui-separation-as-a-module-boundary) | Engine / UI separation as a module boundary | Accepted |
| [ADR-003](#adr-003-localstorage-rather-than-indexeddb-as-primary-storage) | localStorage rather than IndexedDB as primary storage | Accepted |
| [ADR-004](#adr-004-pre-generated-daily-schedule-rather-than-runtime-computation) | Pre-generated daily schedule rather than runtime computation | Accepted |
| [ADR-005](#adr-005-css-filter-blur-rather-than-pre-generated-multi-resolution-images) | CSS `filter: blur()` rather than pre-generated multi-resolution images | Accepted |
| [ADR-006](#adr-006-client-side-search-index-rather-than-server-side-search) | Client-side search index rather than server-side search | Accepted |
| [ADR-007](#adr-007-webp-rather-than-jpegpng) | WebP rather than JPEG/PNG | Accepted |
| [ADR-008](#adr-008-the-no-database-boundary-conditions) | The no-database boundary conditions | Accepted |

---

## ADR-001: Next.js App Router static export rather than Astro / Gatsby

- **Status**: Accepted
- **Date**: 2026-07-09
- **Supersedes**: none
- **Related**: PRD §1 (no runtime backend), PRD §4.2 (out of scope), `architecture.md` §1

### Context

The PRD mandates a hard constraint: the product runs as a **static site** with no runtime backend, no database, and no accounts (PRD §1, §4.2). Hosting costs must be near-zero, load time under a second (PRD AC-41, AC-42), and the build must produce files deployable to any CDN.

At the same time, the product is **interactive**, not content-static: five game modes with real-time guess matching, drag-and-drop reordering (Timeline), progressive blur toggles (Screenshot), input handling (Keywords, Emoji), and a streak state machine shared across pages. The framework must support rich client interactivity while still emitting a fully static bundle.

The team is React-fluent. There is no existing codebase or vendor lock-in.

### Decision

Use **Next.js App Router with `output: 'export'`** as the framework.

- App Router provides file-based routing that maps 1:1 to the PRD §3 information architecture.
- `output: 'export'` produces a fully static `out/` directory (HTML/CSS/JS) with no server runtime.
- `generateStaticParams` enumerates all dynamic routes (`/play/[mode]`, `/archive/[date]`) at build time.
- React Server Components inline puzzle JSON into HTML at build time, eliminating client-side data fetching for first paint.
- One cohesive React/TypeScript model spans engine, data, and UI layers (see ADR-002).

### Alternatives considered

1. **Astro** — static-first, ships zero JS by default, supports React islands.
2. **Gatsby** — SSG pioneer with a GraphQL data layer.
3. **Vite + React + vite-plugin-ssr** (or SvelteKit in static mode) — roll-your-own SSG.
4. **Plain HTML + vanilla JS** — no framework.

### Rejected because

1. **Astro** — Astro's island architecture optimizes for content-heavy pages with sparse interactivity. Our app is the opposite: every page is interactive (game UIs, streak state, share cards). Using Astro with React islands would mean maintaining two frameworks and two mental models for the same React code. Next.js gives equivalent static output with one React-first model. Astro is the better choice for a marketing site or blog; it is the wrong fit for an interactive game.

2. **Gatsby** — Gatsby's GraphQL data layer is overkill for our flat JSON content model (PRD §6.1). The team's React expertise maps directly to Next.js; Gatsby's conventions (node creation, page queries, plugin authoring) add learning overhead without proportional benefit. Gatsby's build times and plugin ecosystem have also aged less gracefully than Next.js's.

3. **Vite + vite-plugin-ssr** — We would have to build routing, static param generation, link prefetching, image handling, and bundle splitting ourselves. Next.js provides these batteries-included. The maintenance burden is not justified for a small team, and the risk of getting infra fundamentals wrong is unnecessary.

4. **Plain HTML + vanilla JS** — Five game modes with shared state (streak, daily progress, share cards) would become a tangled mess without a component model. We would lose TypeScript type safety across the UI layer and the ability to colocate engine tests with components. The "simplicity" is illusory past the first mode.

### Consequences

- **Positive**: One framework, one mental model, full React/TypeScript ecosystem, mature static export, excellent Vercel/Cloudflare deployment story.
- **Positive**: `generateStaticParams` + RSC give us build-time data inlining with zero client fetch on first paint.
- **Negative**: `next/image` optimization is disabled (must use `unoptimized: true`); we handle image optimization ourselves (see ADR-007).
- **Negative**: No API routes, no ISR, no middleware. All runtime logic is client-side. This is acceptable per PRD §4.2 but constrains future features until a backend is introduced (see ADR-008).
- **Negative**: Build time scales with the number of pre-rendered archive pages (365). Acceptable today; monitor as content grows.

---

## ADR-002: Engine / UI separation as a module boundary

- **Status**: Accepted
- **Date**: 2026-07-09
- **Supersedes**: none
- **Related**: PRD §9 (acceptance criteria), `architecture.md` §2, §9

### Context

PRD §9 defines 45 acceptance criteria. Roughly a third of them — AC-9, AC-10, AC-13, AC-17, AC-23, AC-27, AC-29, AC-30, AC-33 — are **pure logic**: scoring formulas, guess matching, position-error calculation, streak multiplier math. These functions have no UI. They are specified with exact numeric examples (e.g., PRD §5.5: "Score = 100 - (15 × 3) = 55") that cry out for unit tests with precise assertions.

If this logic lives inside React components (e.g., a `useScore` hook that computes inside a component), testing requires rendering the component with React Testing Library — slower, noisier, and conflating UI bugs with logic bugs. Logic reuse across the Daily Challenge card, the Stats page, and the Share card would require duplicating or extracting the logic anyway.

The product also has a **data layer** (puzzle JSON, schedules, indices) that changes for content reasons and must be auditable independently of both engine and UI.

### Decision

Enforce a **strict three-layer module separation** with physical folder boundaries and ESLint import rules:

- `src/engine/` — pure game logic. **No React, no Next, no DOM imports.** Pure functions, isomorphic (runs in Node and browser). Unit-tested in pure Node (no jsdom).
- `src/data/` — content (JSON) + schemas + validation. **No React, no Next imports.** Auditable by standalone scripts.
- `src/ui/` — React components, pages, hooks. May import from `engine/` and `data/`.

A fourth module, `src/storage/` (localStorage wrapper + migrations), sits between engine and UI; it may import engine types but not React/Next.

Import rules are enforced by `eslint-plugin-import` and `no-restricted-imports`:
- `engine/` and `data/` cannot import `react`, `next`, or DOM globals.
- CI runs engine unit tests in pure Node to prove no DOM coupling.

### Alternatives considered

1. **Single flat `src/` with naming conventions** (`*.engine.ts`, `*.ui.ts`).
2. **Monorepo with separate packages** (`@guess/engine`, `@guess/data`, `@guess/ui`).
3. **Feature-sliced design** (a community architecture with features/pages/widgets/entities layers).
4. **Logic inside React components** (hooks like `useKeywordsScore`).

### Rejected because

1. **Flat naming conventions** — Conventions decay under deadline pressure. Without physical folder boundaries and an import linter, a developer will reach across layers and the convention silently erodes. Folder + ESLint enforcement makes violations a CI failure, not a code-review negotiation. The cost of enforcement is near-zero; the cost of drift is high.

2. **Monorepo packages** — Adds tooling overhead (workspaces, build ordering, publish config) disproportionate to a single deployable static site. The same isolation is achievable with folder boundaries + import linting at zero tooling cost. We can extract packages later if a second consumer of the engine appears (e.g., a React Native port) — the separation makes that extraction trivial when warranted.

3. **Feature-sliced design** — Optimizes for large teams and long-lived enterprise apps with many features. Our app has one feature (the game) with five modes. The overhead of features/pages/widgets/entities layers is not justified and would slow initial delivery.

4. **Logic in components** — Untestable in isolation. Testing a `useKeywordsScore` hook requires RTL setup, is slower, and conflates UI bugs with logic bugs. Logic reuse across Daily card, Stats, and Share requires extraction anyway — extracting to a pure module is the clean answer and the test story is dramatically better.

### Consequences

- **Positive**: Engine is unit-testable in milliseconds, in pure Node, with precise assertions matching PRD examples.
- **Positive**: Engine is reusable (a future React Native port imports it unchanged).
- **Positive**: Content audits run without loading any React code.
- **Positive**: New developers can reason about "where does this change?" with a clear answer (rules → engine, content → data, UX → ui).
- **Negative**: Slightly more files and indirection than a flat structure. Acceptable trade.
- **Negative**: ESLint import config must be maintained. Minor ongoing cost.

---

## ADR-003: localStorage rather than IndexedDB as primary storage

- **Status**: Accepted
- **Date**: 2026-07-09
- **Supersedes**: none
- **Related**: PRD §7.3 (streak rules), §7.4 (stats), R4 (< 100KB target), `architecture.md` §6

### Context

PRD §1, §4.1 (items 7, 8), §7.3, §7.4, and §9.6 require persistent player state in the browser: daily progress, streak counters, stats, and a 30-day history. There is no server. The total data footprint is small — a realistic worst case is ~20KB (60 days of daily entries + 30 days of stats). PRD R4 sets a soft target of < 100KB.

Two client-side persistence APIs are candidates: `localStorage` (synchronous, key-value, ~5MB quota, simple) and `IndexedDB` (asynchronous, object store, larger quota, complex).

### Decision

Use **localStorage as the primary and only persistence API** for the MVP, wrapped in a typed module (`src/storage/client.ts`) that centralizes reads, writes, migrations, and capacity monitoring.

- A single top-level key (`gtg:state:v1`) holds the entire state object as JSON. This makes migration atomic and size accounting trivial.
- The wrapper is SSR-safe (no-ops on the server during Next.js build), handles quota errors with graceful pruning, and detects storage-unavailable contexts (private mode, disabled).
- IndexedDB is **not used** in MVP. It is reserved for a possible post-MVP offline-puzzle-cache (PWA enhancement).

### Alternatives considered

1. **IndexedDB as primary storage** (with a promise-based wrapper like `idb-keyval`).
2. **Many small localStorage keys** (e.g., `gtg:streak`, `gtg:stats:keywords`, `gtg:daily:2026-07-09`).
3. **Cookies** for state.
4. **Session storage for daily progress + localStorage for streaks.**

### Rejected because

1. **IndexedDB primary** — Over-engineered for ~20KB of structured data. IndexedDB's API is asynchronous (every read is a promise), which complicates synchronous UI paths (e.g., checking "did the player already solve today's Keywords?" on first render). It has worse edge-case support in private mode (some browsers throw on `indexedDB.open` in private windows, others silently cap quota at 0). The larger quota (hundreds of MB) is irrelevant when we target < 100KB. IndexedDB is the right tool for large or structured blobs (e.g., caching puzzle JSON for offline); it is the wrong tool for a 20KB state object. We keep it in reserve for offline content caching, which is its actual strength.

2. **Many small keys** — Makes migration non-atomic (a crash mid-migration leaves half the keys at v2 and half at v1). Complicates size accounting (must sum across keys). Risks orphaned keys after schema changes (a renamed key leaves the old one consuming quota forever). A single object is simpler and safer at our scale.

3. **Cookies** — Sent on every HTTP request to the origin (we are static, but the CDN still transacts). 4KB limit per cookie, and we need ~20KB. Cookies are the wrong tool for client-only state; they are for server-readable state, which we explicitly do not have.

4. **Session storage for daily progress** — Session storage is cleared when the tab closes. PRD US-6 explicitly requires: "close tab → reopen → progress intact" within the same UTC day. Session storage violates this. All persistent state belongs in localStorage.

### Consequences

- **Positive**: Simple, synchronous API; trivial migration story; easy size monitoring.
- **Positive**: Universal browser support including older Safari and private mode (with graceful degradation when blocked).
- **Positive**: One key, one object, one version — easy to inspect in devtools.
- **Negative**: 5MB quota is shared across all keys on the origin; if a future feature needs more (e.g., offline puzzle cache), we must use IndexedDB for that feature. The architecture anticipates this by keeping the storage wrapper abstracted.
- **Negative**: Synchronous reads block the main thread. At 20KB this is sub-millisecond and irrelevant; if state grew to MB scale, we would revisit. The < 100KB cap (PRD R4) keeps this safe.

---

## ADR-004: Pre-generated daily schedule rather than runtime computation

- **Status**: Accepted
- **Date**: 2026-07-09
- **Supersedes**: none
- **Related**: PRD §5.1 (daily challenge), §6.3 (schedule), R6 (schedule expiry), `architecture.md` §5

### Context

PRD §5.1 and §6.3 specify that the Daily Challenge is **deterministic from the UTC date string** — same date = same puzzles for every player — and that "no runtime computation is needed." The PRD further specifies a `data/daily-schedule.json` file mapping date strings to puzzle IDs, pre-generated for a configurable range (e.g., 365 days).

Two implementation strategies satisfy "deterministic from date":
1. **Runtime computation** in the browser: `puzzles = hash(utcDate) % poolSize` for each mode, computed on page load.
2. **Build-time pre-generation**: a script computes the schedule once and commits it as JSON; the client does a lookup.

The PRD's mention of `data/daily-schedule.json` leans toward option 2, but the decision is significant enough to record explicitly.

### Decision

**Pre-generate the daily schedule at build time** as `data/daily-schedule.json`, covering 365 days from the build date. The client does a simple `schedule[utcDateString]` lookup at runtime.

- The generation script (`scripts/gen-schedule.ts`) uses a deterministic hash of the UTC date string per mode, applies a cross-mode diversity constraint (at least 3 distinct domains per day, per PRD §5.1), and writes the schedule.
- The script is append-friendly: extending the schedule starts from the last date + 1, preserving past entries (which must never change — archive replay depends on immutability).
- CI checks the schedule's expiry date and fails the build if it's < 30 days away (PRD R6 mitigation).

### Alternatives considered

1. **Runtime computation in the browser** (`hash(today) % poolSize`).
2. **Server-side schedule endpoint** (a serverless function returning today's puzzles).
3. **Per-mode schedule files** (`keywords-schedule.json`, etc.).
4. **Infinite schedule** (generate 10+ years).

### Rejected because

1. **Runtime computation** — Two problems. First, **immutability across deploys**: if the puzzle pool changes between two visits on the same UTC day (e.g., a content PR deploys at 18:00 UTC), a player who played at 09:00 and returns at 20:00 could see a different puzzle, breaking the "same date = same puzzles for every player" invariant (PRD §5.1). A build artifact is immutable per deploy. Second, **diversity constraints**: PRD §5.1 says "the domain/topic of each puzzle rotates daily to avoid repetition." Enforcing this requires scanning adjacent days, which means the full schedule must be available anyway — at which point pre-generating it is strictly simpler than recomputing with constraints at runtime.

2. **Server-side endpoint** — Introduces a runtime backend, violating PRD §1 ("no runtime backend") and §4.2. Adds latency, cost, and an ops surface. The schedule is small (< 100KB for 365 days × 4 IDs); shipping it as a static file is strictly better.

3. **Per-mode schedule files** — The Daily Challenge needs all 4 modes for a given date; a single file with all 4 IDs per date is one lookup. Four files would be four lookups and a client-side join. The single-file approach is simpler and the diversity constraint is easier to enforce when all 4 selections are visible in one place during generation.

4. **Infinite schedule** — The puzzle pool will grow over time (PRD R1 mitigation: launch with 50+ per mode, add in batches). An infinite schedule computed against today's pool becomes stale and cannot benefit from new content. 365 days + a CI expiry check + periodic regeneration is the right balance between headroom and adaptability.

### Consequences

- **Positive**: Deterministic, immutable per deploy; no client computation; auditable by the content team; diversity constraints enforced at generation time.
- **Positive**: Archive replay is trivially correct — the schedule never changes a past date's puzzles.
- **Negative**: Schedule must be regenerated periodically. Mitigated by CI expiry check (PRD R6) and an append-friendly script.
- **Negative**: Build time grows linearly with schedule length. 365 days is fast (< 1s); 10 years would be slower for no benefit.
- **Negative**: A content PR that adds puzzles doesn't retroactively appear in already-shipped schedule dates. This is a feature (immutability), not a bug — new puzzles appear in future dates on the next schedule extension.

---

## ADR-005: CSS `filter: blur()` rather than pre-generated multi-resolution images

- **Status**: Accepted
- **Date**: 2026-07-09
- **Supersedes**: none
- **Related**: PRD §5.4 (Screenshot mode), AC-19, AC-20, `architecture.md` §11

### Context

Screenshot mode (PRD §5.4) requires an image that starts heavily blurred (blur level 3) and sharpens in 3 steps (3 → 2 → 1 → 0). The PRD specifies 4 discrete levels.

Two implementation strategies:
1. **CSS `filter: blur()`** — load one full-resolution WebP, apply CSS blur at 4 discrete levels via class names. GPU-accelerated, transitions animate via CSS.
2. **Pre-generated multi-resolution images** — at build time, produce 4 WebP files per puzzle (blur-3, blur-2, blur-1, blur-0). On sharpen, swap the `src`.

The choice affects asset count, build complexity, schema shape, bandwidth, and the visual result.

### Decision

Use **CSS `filter: blur()`** with 4 discrete class-based levels (`blur-level-3` → `blur-level-0`). Load one WebP per puzzle. Transition between levels with a CSS transition for the sharpen animation.

- `blur-level-3` → `filter: blur(20px) brightness(0.8)`
- `blur-level-2` → `filter: blur(12px)`
- `blur-level-1` → `filter: blur(6px)`
- `blur-level-0` → `filter: none`

The puzzle JSON references a single image path (`image: "/images/puzzles/ss-001.webp"`), matching PRD §6.1.

### Alternatives considered

1. **Pre-generated multi-resolution images** (4 WebP files per puzzle, swapped on sharpen).
2. **Canvas-based runtime blur** (draw image to canvas, apply a blur shader).
3. **SVG filter blur** (`<feGaussianBlur>`) referencing the image.

### Rejected because

1. **Pre-generated multi-resolution** — Four costs. (a) **Asset count**: 4 files × 200 puzzles = 800 image files to manage, name, and serve. (b) **Build complexity**: a processing pipeline (e.g., `sharp`) must run 4 blur levels per image, manage 4 paths per puzzle, and the puzzle schema must reference 4 URLs instead of 1. (c) **Bandwidth**: pre-gen trades one larger fetch for multiple smaller fetches — on sharpen, a second network request fires (bad for perceived speed, especially on 4G — PRD Persona A). CSS filter loads once and transitions instantly. (d) **Schema bloat**: the puzzle JSON grows from one `image` field to four, complicating authoring and auditing. CSS filter achieves visually equivalent blur with one asset, one field, one fetch. The only real benefit of pre-gen — slightly smaller first-paint bytes — is marginal because the unblurred WebP is already ~30–60KB and loads in well under PRD AC-41's 1.5s budget.

   **Anti-cheat consideration**: pre-gen doesn't actually prevent cheating — a determined player can fetch the unblurred asset directly from the CDN. Since the game is single-player with no prizes (PRD §4.2: no monetization, no leaderboards in MVP), anti-cheat is a non-requirement. CSS filter's "cheating via devtools" risk is acceptable.

2. **Canvas-based runtime blur** — More complex than CSS filter (requires canvas setup, drawImage, shader or iterative blur, redraw on level change). Offers no visual advantage over CSS filter. Canvas also has worse accessibility story (canvas content is not announced by screen readers without extra ARIA work). CSS filter is the simplest sufficient solution.

3. **SVG filter blur** — SVG filters are less performant than CSS `filter: blur()` in most browsers (not GPU-accelerated in all cases), and embedding the image in SVG complicates the asset pipeline (SVG must reference the image, breaking the simple `<img src>` model). No benefit over CSS filter.

### Consequences

- **Positive**: One asset per puzzle; one field in the schema; one network fetch; trivial build pipeline; GPU-accelerated transitions.
- **Positive**: Puzzle JSON matches PRD §6.1 exactly (single `image` field).
- **Negative**: The full-resolution image is in the browser's cache at blur level 3; a player can remove the CSS filter via devtools to see the answer. Acceptable because the game is single-player with no prizes and no leaderboard (PRD §4.2).
- **Negative**: Slight "halo" effect at blur(20px) where the blurred edges extend beyond the image bounds. Mitigated by `overflow: hidden` on the image container and a subtle `brightness(0.8)` to deepen the obscurity at level 3.
- **Negative**: Very old browsers without CSS filter support would show the unblurred image. Acceptable — CSS `filter: blur()` has universal modern support; the degraded case is "easier game," not "broken game."

---

## ADR-006: Client-side search index rather than server-side search

- **Status**: Accepted
- **Date**: 2026-07-09
- **Supersedes**: none
- **Related**: PRD §3 (topic browser, P2), `architecture.md` §8

### Context

PRD §3 includes a P2 use case: "Browse available topics/domains to find interesting puzzles." The archive also lets players find past challenges by date. A search capability — "I remember a puzzle about a volcano" — materially supports discovery.

The product has no runtime backend (PRD §1, §4.2). The puzzle corpus is small at launch (50+ per mode, 200+ total — PRD R1) and grows in batches. Search must work without a server.

### Decision

Use a **pre-built client-side search index** shipped as a static JSON file (`data/search-index.json`), queried in the browser with **`fuse.js`** for fuzzy matching.

- The index is a flat array of entries: `{ id, mode, domain, text, url }` where `text` is a pre-tokenized concatenation of searchable fields (target + aliases + keywords/emojis + domain), lowercased at build time.
- The index is ~5–15KB for 200 puzzles, loaded lazily only on the browse/archive pages.
- `fuse.js` (~6KB gzipped) is initialized with the index on first search; results return in < 10ms for 200 entries.

### Alternatives considered

1. **Self-built inverted index** with exact substring match (a `Map<token, puzzleId[]>`).
2. **Algolia / Meilisearch / Elastic Search** (hosted or self-hosted search service).
3. **No search; pure filter UI** (dropdowns for mode + domain).
4. **Build-time generated search pages** (one HTML page per query).

### Rejected because

1. **Self-built inverted index** — Justified only for large corpora (thousands of documents) where `fuse.js`'s O(n) scan would be slow. Our corpus is 200 puzzles; `fuse.js` scans it in < 10ms. A self-built index adds maintenance burden (tokenizer, stemmer, ranking, typo tolerance) for no perceivable UX gain at this scale. A self-built index also lacks typo tolerance, which materially hurts discoverability for casual users (Persona C: a 10-year-old) and mobile typists (Persona A: on a phone). Premature optimization.

2. **Algolia / Meilisearch / Elastic** — All require a runtime backend or a third-party API call, violating PRD §1 ("no runtime backend") and §4.2. They add cost (Algolia pricing tiers, Meilisearch hosting), a network dependency for a feature that works fine on a 15KB static index, and a vendor lock-in. They are the right tool for large-scale search (millions of documents, faceted filters, real-time indexing); they are massive overkill for 200 puzzles.

3. **No search; pure filter UI** — Filters work for structured browsing ("show me Geography puzzles in Keywords mode") but not for discovery ("I think there was a puzzle about a volcano"). The PRD P2 use case is "browse available topics/domains to find interesting puzzles" — search complements filters and serves the discovery intent that filters alone can't. Both are cheap to ship; omitting search saves ~6KB (fuse.js) for a real UX loss.

4. **Build-time generated search pages** — The query space is infinite (any search string); cannot be pre-generated. Search is inherently interactive and must run client-side. This alternative is technically infeasible.

### Consequences

- **Positive**: Zero backend; zero cost; instant results; typo-tolerant; works offline (PWA).
- **Positive**: Index is generated from the same puzzle JSON as everything else — single source of truth.
- **Negative**: Index size grows linearly with puzzle count. At 200 puzzles it's ~15KB; at 2000 it would be ~150KB. If the corpus grows past ~1000 puzzles, revisit (either switch to a self-built inverted index for sublinear lookup, or paginate the index). The 365-day schedule and content batching strategy make explosive growth unlikely in the near term.
- **Negative**: `fuse.js` is a ~6KB gzipped dependency. Acceptable for the UX value; revisit only if bundle size becomes a problem (PRD AC-43 Lighthouse threshold).
- **Negative**: Search index must be regenerated when puzzles are added. Automated in the build pipeline (`scripts/gen-search-index.ts` runs if the source indices changed).

---

## ADR-007: WebP rather than JPEG/PNG

- **Status**: Accepted
- **Date**: 2026-07-09
- **Supersedes**: none
- **Related**: PRD §5.4 (Screenshot mode images), AC-21 (public-domain images), AC-41 (FCP < 1.5s), `architecture.md` §11

### Context

Screenshot mode (PRD §5.4) and OG share images (PRD D5) require raster images. The constraints are:
- **Fast load** — PRD AC-41 (FCP < 1.5s on 4G) and AC-43 (Lighthouse Perf ≥ 85) demand small image payloads.
- **Public-domain sourcing** — PRD AC-21; images come from Wikimedia, NASA, NOAA, or original illustrations.
- **Transparency** — silhouettes (a fallback content type per PRD §5.4 and R2) need alpha channel.
- **Universal browser support** — the audience includes Persona C on an older tablet.

### Decision

Use **WebP** as the sole raster image format for all puzzle images, produced at build time by a processing script (`scripts/process-images.ts`).

- Photos: WebP at quality ~78, target size 800×600, ~30–60KB per image.
- Silhouettes: WebP with alpha, or PNG for tiny (< 5KB) sharp-edge cases where WebP's lossy compression artifacts are visible.
- EXIF stripped (privacy + size).
- The build pipeline enforces a per-image size cap (e.g., 80KB) via the content audit script.

### Alternatives considered

1. **JPEG** (baseline or progressive).
2. **PNG** for all images.
3. **AVIF**.
4. **SVG** for all images.
5. **Dual-format** (WebP + JPEG fallback via `<picture>`).

### Rejected because

1. **JPEG** — 25–35% larger than WebP at equivalent visual quality (verified in POC-6). No alpha channel support (baseline JPEG), which breaks silhouettes. JPEG is the legacy default; WebP strictly dominates it for our use case. The only reason to prefer JPEG is ancient browser support (IE, very old Safari), which is not our audience.

2. **PNG** — Lossless, which is the wrong tradeoff for photographs (PNG photos are 3–5× larger than WebP at the same visual quality). PNG's strength is sharp edges and transparency for small graphics (icons, silhouettes) — we use it for those narrow cases, not for photos. Using PNG for all images would balloon payload sizes and break PRD AC-41.

3. **AVIF** — AVIF offers ~20% smaller files than WebP, but: (a) encoding is 5–10× slower than WebP at build time, slowing CI; (b) decoder support is less universal (Safari < 16.4, older Android); (c) the size win is marginal at our image sizes (saving ~6KB on a 30KB image is invisible to the user). The build-time cost and compat risk outweigh the size benefit for a small corpus. Revisit when AVIF encoding is faster and old-Safari share drops below 0.5%.

4. **SVG** — Excellent for silhouettes and illustrations but cannot represent photographs (the bulk of Screenshot mode content — "Mount Everest," "Sahara," "Eiffel Tower" per PRD §6.2). A photo cannot be meaningfully SVG-encoded; SVGs of photos become huge or ugly. SVG is used where appropriate (silhouettes, icons) but not as the universal format.

5. **Dual-format (WebP + JPEG fallback)** — Doubles asset count, doubles build processing, complicates the schema (two paths per puzzle), and serves a sub-1% segment (browsers without WebP support, which is essentially zero in 2026: Chrome, Edge, Firefox, and Safari 16+ all support WebP). The maintenance cost is disproportionate to the benefit. We accept minor degradation for the sub-1% (the image simply may not display, with the placeholder fallback from §12 handling the error) rather than maintain dual assets.

### Consequences

- **Positive**: 25–35% smaller payloads than JPEG; alpha support for silhouettes; universal modern browser support; single format simplifies the pipeline and schema.
- **Positive**: Per-image size cap (80KB) keeps total image budget bounded and predictable for Lighthouse (PRD AC-43).
- **Negative**: Sub-1% of browsers (very old Safari, IE) won't render WebP. Mitigated by the `<img>` `onError` placeholder fallback (see `architecture.md` §12) — the game remains playable (the player can still guess from keywords/facts).
- **Negative**: WebP encoding adds a build step (the processing script). This is a one-time setup cost; the script runs in CI and is fast.
- **Negative**: If the content team sources a format WebP can't losslessly preserve (rare), the script converts anyway with minor quality loss. Acceptable for a guessing game where images are functional, not artistic showcases.

---

## ADR-008: The no-database boundary conditions

- **Status**: Accepted
- **Date**: 2026-07-09
- **Supersedes**: none
- **Related**: PRD §1 (no database), §4.2 (out of scope), §10.3 (migration triggers), D8 (when to migrate), `architecture.md` §16

### Context

PRD §1 states: "no database, no accounts, no runtime backend. The entire product runs as a static site." PRD §4.2 reinforces: no user accounts, no multiplayer, no global leaderboards, no user-generated content, no monetization. PRD §10.3 defines four explicit triggers that would justify introducing a database, and PRD D8 defers the reassessment to "after 3 months of usage data."

This is the most consequential architectural commitment in the project. It shapes every other decision (static export, localStorage, pre-generated schedule, client-side search). Getting the boundary wrong — either by prematurely adding a backend or by refusing to add one when a trigger fires — has high cost.

### Decision

**Adopt the no-database architecture as the explicit baseline**, and define the **four boundary conditions** under which a database / runtime backend becomes justified. Until one of these conditions is demonstrably met, the team will resist backend adoption.

The four triggers (mirroring PRD §10.3):

1. **Social features requested** — players consistently ask to compare scores with friends or see community averages. This requires server-side score submission and retrieval.
2. **Cross-device sync demanded** — players want streak and stats to follow them across devices. This requires server-side user identity (anonymous, device-paired is acceptable).
3. **User-generated content** — players want to create and share custom puzzles. This requires content storage and moderation.
4. **Dynamic content updates** — the content team wants to add puzzles without a full rebuild and deploy. This requires a content API.

**Non-triggers** (explicitly NOT sufficient to justify a backend):
- "We might want leaderboards someday" — not a trigger until players actually ask (PRD R7).
- "A database would be more 'professional'" — not a technical reason.
- "We want to add accounts" — explicitly out of scope (PRD §4.2) unless cross-device sync demands it.
- "The content team finds JSON PRs annoying" — solve with tooling (a content-editor web UI that commits JSON via the GitHub API), not a database.

When a trigger fires, the migration follows the path in `architecture.md` §16, which preserves the three-layer separation (ADR-002) so each migration touches at most one layer.

### Alternatives considered

1. **Start with a backend "to be safe"** (e.g., add a tiny serverless function and a Postgres instance from day one).
2. **Add a backend as soon as any social feature is even discussed.**
3. **Never add a backend, even if a trigger fires** (dogmatic static-only).
4. **Use a backend-as-a-service (Firebase, Supabase) from the start** to "save time later."

### Rejected because

1. **Start with a backend "to be safe"** — Violates PRD §1 directly. Adds cost (even a free tier has limits and a learning curve), ops burden (monitoring, schema migrations, backups), latency (every score submission is a network call), and a failure mode (the backend goes down → the game is unplayable). The PRD's core thesis is that a static site is *superior* in cost, speed, and simplicity for this product — not a compromise. Adding a backend "to be safe" rejects that thesis without justification. If none of the four triggers fire, the backend is pure waste. The architecture is designed to make adding a backend later cheap (ADR-002's separation); there is no "lock-in" cost to waiting.

2. **Add a backend at first discussion of a social feature** — Discussion is not demand. PRD R7 notes "Players want social features" as a High-probability risk, but the MVP explicitly defers it and communicates "personal stats only" (PRD §4.2, R7 mitigation). Acting on discussion rather than demonstrated demand leads to building for imagined users. The trigger is "players consistently request" — i.e., real usage signal, not internal speculation. Reassess quarterly (PRD D8).

3. **Never add a backend, dogmatically** — If a trigger genuinely fires (e.g., 40% of weekly users request cross-device sync in a survey), refusing to migrate would cap the product's growth and alienate the user base. The static architecture is a means to an end (cost, speed, simplicity), not a religious commitment. The boundary conditions exist to define when the means no longer serve the end. Dogmatic refusal confuses the means for the end.

4. **Backend-as-a-service from day one (Firebase/Supabase)** — Same core problem as option 1: it introduces a runtime dependency, vendor lock-in, and a failure mode, contrary to PRD §1. BaaS reduces the ops burden of a backend but doesn't eliminate the architectural commitment. It also tends to creep: "we already have Firebase, let's use it for X" erodes the static boundary. If a trigger fires, BaaS is a reasonable *migration target* (Supabase Postgres fits the §16 path well), but it is not a starting point.

### Consequences

- **Positive**: Zero backend cost; zero ops burden; sub-second loads; no auth friction; no failure mode beyond the CDN.
- **Positive**: The four triggers give the team a clear, shared definition of "when to reconsider" — no indefinite anxiety about whether a backend is "needed."
- **Positive**: The three-layer separation (ADR-002) and storage abstraction (ADR-003) make each trigger's migration scoped to one layer. The cost of waiting is low.
- **Positive**: The explicit non-triggers list prevents feature creep masquerading as technical necessity.
- **Negative**: Some features are impossible until a trigger fires (global leaderboards, cross-device sync, UGC). This is an accepted scope limit, not a defect.
- **Negative**: Content updates require a rebuild+redeploy (Trigger 4 territory). For the MVP's content cadence (batched additions), this is fine; if the content team needs daily hot-fixes, Trigger 4 has fired.
- **Negative**: Players who clear browser data lose their streak (PRD §7.3). This is a known, documented limitation (PRD R3, R4) and is the explicit trade for not having accounts. A streak-freeze mechanic (PRD R3 mitigation) is a post-MVP polish item that does NOT require a backend.

---

*End of ADRs. For the full architecture context, see [`architecture.md`](./architecture.md). For product requirements, see [`PRD.md`](./PRD.md).*
