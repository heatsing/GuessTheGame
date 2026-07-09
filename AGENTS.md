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

## Agent Guardrails

These operational rules govern how agents (PM, Architect, Engineer, Reviewer, DevOps, etc.) must behave on this project. They are enforceable: violating any of them blocks a phase from being marked complete.

| # | 守则 (中文) | Rule (English) |
|---|------------|----------------|
| 1 | 不要一次性开发整个网站 | Do not develop the entire website in one shot — deliver in phased, reviewable slices |
| 2 | 不要未经同意升级主要框架 | Do not upgrade major frameworks (Next.js / React / TypeScript / Tailwind) without explicit owner approval |
| 3 | 不要随意添加依赖 | Do not add dependencies casually — every new dep needs a stated reason and owner sign-off |
| 4 | 不要把同一逻辑复制到每个模式 | Do not copy the same logic into every mode — extract shared helpers to a single module |
| 5 | 不要用 any 粘住 TypeScript 裂缝 | Do not use `any` to paper over TypeScript cracks — fix the types or use `unknown` + narrowing |
| 6 | 不要删除失败测试换取绿色 CI | Do not delete failing tests to get a green CI — fix the code or fix the test, never silence |
| 7 | 不要伪造 API 或数据库 | Do not fabricate APIs or databases — static-only; if it is not real, do not pretend it is |
| 8 | 不要伪造全站用户数据 | Do not fabricate site-wide user data — no fake leaderboards, no synthetic counts, no mock activity |
| 9 | 不要在客户端组件里散落 localStorage | Do not scatter localStorage calls in client components — all access goes through `src/storage/` adapter |
| 10 | 不要给所有题目生成薄 SEO 页面 | Do not generate thin SEO pages for every puzzle — only indexable routes get real, unique content |
| 11 | 不要让多个 Agent 同时修改相同文件 | Do not let multiple agents modify the same file simultaneously — coordinate via sequential handoffs |
| 12 | 不要跳过岗位交接文档 | Do not skip role handoff documents — every phase transition needs a `docs/handoff/` summary |
| 13 | 不要自动进入下一阶段 | Do not automatically advance to the next phase — acceptance must pass and the owner must approve |

### Enforcement

- A reviewer/acceptance lead must verify each guardrail before signing off a phase.
- Violations found during review are recorded in `docs/testing/final-code-review.md` and must be fixed (or explicitly waived by the owner) before the phase can close.
- The acceptance lead's final verdict (PASS/FAIL) is gated on these guardrails, not only on green CI.

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
