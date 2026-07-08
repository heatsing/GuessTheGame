# AGENTS.md — Guess the Game

## Project Identity

**Product name:** Guess the Game
**Stage:** 0-to-1 product definition (pre-implementation)
**Repository:** https://github.com/heatsing/GuessTheGame

## Hard Constraints

- No database — all data is static JSON/TypeScript files or browser localStorage
- No login — no user accounts, no server-side sessions
- No self-hosted runtime backend — static export only (Next.js App Router, static generation)
- User progress saved exclusively in browser (localStorage / IndexedDB)
- No fabricated player data — no fake leaderboards, no synthetic user counts
- IP-safe content only — no copyrighted screenshots, logos, characters, box art, or trademarked UI

## MVP Game Modes

1. Daily Mixed Challenge
2. Keywords
3. Emoji
4. Screenshot
5. Timeline

## Agent Roles

| Role | Phase | Deliverable |
|------|-------|-------------|
| PM | Product definition | PRD, game rules, acceptance criteria |
| Solution Architect | Architecture | Static architecture doc, DECISIONS |
| UX Designer | Interaction design | Sitemap, user flows, component states |
| Engineer | Implementation | Code (future phase) |

## Document Locations

- `docs/PRD.md` — Product requirements
- `docs/architecture.md` — Static application architecture
- `docs/ux-design.md` — UX and interface system
- `docs/STATUS.md` — Phase tracker
- `docs/DECISIONS.md` — Architecture decision records
- `docs/handoff/` — Phase handoff summaries

## Commit Conventions

- `docs: define product requirements and game rules`
- `docs: define static application architecture`
- `docs: define user experience and interface system`
- `feat:` for code implementation (future phases)
- `fix:` for bug fixes
