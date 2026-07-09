# Project Status — Guess the Game

## Current Phase

**Phase 1–3: Product & Design Definition** — COMPLETE

## Phase Tracker

| Phase | Role | Deliverable | Status | Commit |
|-------|------|-------------|--------|--------|
| 1 | PM | PRD + game rules + acceptance criteria | done | docs: define product requirements and game rules |
| 2 | Architect | Static architecture + DECISIONS | done | docs: define static application architecture |
| 3 | UX Designer | Sitemap + user flows + component states | done | docs: define user experience and interface system |
| 4a | Engineer | Application shell | done | chore: initialize static application shell |
| 4b | Content Architect | Puzzle content system | done | feat: add validated static puzzle content system |
| 4c | Engine Engineer | Game engine | done | feat: implement shared puzzle game engine |
| 4d | Engineer | UI implementation | pending | — |

## Key Decisions Log

- 2026-07-09: Product pivoted from old "GuessVerse" (Semantic Guess + geography games) to "Guess the Game" (5-mode guessing platform). Local codebase deleted; GitHub repo reset to empty.
- 2026-07-09: Confirmed static-only architecture — no database, no login, no runtime backend.
- 2026-07-09: PRD complete — 5 game modes (Daily Mixed Challenge, Keywords, Emoji, Screenshot, Timeline), 45 acceptance criteria, 22 user stories.
- 2026-07-09: Architecture complete — Next.js App Router static export, 8 ADRs, engine/UI separation, localStorage data layer with schema migration.
- 2026-07-09: UX design complete — 12-page sitemap, full user flows, design tokens, 30+ component inventory, accessibility spec.
- 2026-07-09: Infrastructure shell complete — Next.js 15.5.20, `output: 'export'` enabled, build wrapper handles Windows Defender phantom-file bug, dark theme via `color-scheme: dark`.

## Deliverables

| Document | Path | Description |
|----------|------|-------------|
| PRD | `docs/PRD.md` | Product requirements, game rules, scoring, acceptance criteria |
| Architecture | `docs/architecture.md` | Static app architecture, 14 topics with alternatives |
| ADRs | `docs/DECISIONS.md` | 8 architecture decision records |
| UX Design | `docs/ux-design.md` | Sitemap, flows, design tokens, component inventory |
| Handoff 1→2/3 | `docs/handoff/phase-1-to-2-3.md` | PM to Architect/UX handoff |
| Handoff 2→4 | `docs/handoff/phase-2-to-4.md` | Architect to Engineer handoff |
| Handoff 3→4 | `docs/handoff/phase-3-to-4.md` | UX to Engineer handoff |

## Blockers

None.

## Next Actions

1. Phase 4: Engineer implements code based on PRD + architecture + UX docs
2. Set up Next.js project with static export
3. Implement game engine (pure functions)
4. Build UI components per UX spec
5. Create content (50+ puzzles per mode)
