# Handoff: Phase 1 → Phase 2 & 3

> Date: 2026-07-09 · From: PM · To: Architect, UX Designer

## What was delivered

- `docs/PRD.md` — Complete PRD with 10 sections covering background, personas, information architecture, MVP scope, non-goals, game rules for all 5 modes, content model, scoring/streak rules, 22 user stories, 45 acceptance criteria, and risks/pending decisions.

## Key decisions for downstream phases

1. **5 game modes** with specific scoring formulas (see PRD section 7.1)
2. **Daily Challenge = 4 puzzles** (one per mode), deterministic from UTC date hash
3. **Static-only architecture** — no database, no backend, localStorage for progress
4. **Content model** — JSON puzzles with 4 sub-schemas (keywords, emoji, screenshot, timeline)
5. **Domains**: Geography, Science, History, Nature, Everyday
6. **Daily schedule** pre-generated at build time (365 days)
7. **Streak**: strict UTC boundary, multiplier 1.0x to 1.5x
8. **Share**: text-based for MVP, OG image for link previews

## What the Architect needs to decide

- Next.js App Router static export configuration
- TypeScript module boundaries (engine vs UI vs data)
- JSON content file organization and indexing
- Daily schedule generation script
- localStorage schema (versioning, migration)
- Search index strategy (client-side, pre-built)
- Image processing pipeline (blur, WebP, compression)
- PWA service worker caching strategy
- Build and deploy pipeline

## What the UX Designer needs to define

- Complete sitemap with all pages
- Home page layout (Daily Challenge status + mode quick-start)
- Daily Challenge user flow (4 cards → solve → total score → share)
- Individual mode flows (input → guess → feedback → result)
- Feedback states: correct, wrong, give-up, hint revealed
- Result modal design
- Share flow (copy to clipboard / Web Share API)
- Stats page layout (streak, heatmap, mode breakdown)
- Mobile layout (bottom nav, touch targets)
- Keyboard interaction spec
- Loading, error, empty states
- Design tokens (colors, spacing, typography)
- Component inventory

## Pending decisions that may affect both phases

- D1: No streak for unlimited mode (leaning yes)
- D2: Archive replays don't count toward stats (leaning yes)
- D6: Timeline vertical-only layout (leaning yes)
- D7: Use device time for UTC boundary (decided yes for MVP)
