# Phase 4e–4j Acceptance Handoff

**Date:** 2026-07-09
**From:** Acceptance Lead
**To:** Owner (next-phase gatekeeper) + Phase 4d Engineer
**Verdict:** **PASS** (current phase scope). Phase 4d must NOT auto-advance (AGENTS.md guardrail #13).

---

## 1. Scope accepted

Phases 4e–4j + final review (4k) + acceptance wrap-up (4l):

| Phase | Deliverable | Status |
|-------|-------------|--------|
| 4e | Client data persistence (`src/storage/`) | done |
| 4f | Technical SEO & discovery | done |
| 4g | Performance & accessibility | done |
| 4h | QA regression coverage | done |
| 4i | Security / privacy / copyright review | done |
| 4j | Release pipeline (CI + deploy) | done |
| 4k | Final code review (8 subagents) | done |
| 4l | Acceptance wrap-up + in-scope fixes | done |

---

## 2. Acceptance criteria re-verification

Each criterion was checked against real command output, not assumptions.

| # | Criterion | Evidence | Pass |
|---|-----------|----------|------|
| 1 | No scattered localStorage in components | `Grep` for `localStorage` in `src/components/**` → 0 hits; all access via `src/storage/adapter.ts` | ✅ |
| 2 | Schema versioning + V1→V2 migration | `CURRENT_SCHEMA_VERSION=2`, `migrate.ts` chained, 14 migrate tests pass | ✅ |
| 3 | JSON corruption recovery (no overwrite) | `client.ts` parks raw to `:corrupted`, returns default; 23 client tests pass | ✅ |
| 4 | Memory degradation when storage unavailable | `createMemoryAdapter()` singleton + Safari private-mode probe; adapter tests pass | ✅ |
| 5 | Idempotent domain actions | `recordModeResult` no-op on duplicates, no-downgrade; 29 actions tests pass | ✅ |
| 6 | Per-page unique metadata + sitemap/robots | `sitemap.ts` 9 routes, `robots.ts` disallow thin pages; build generates 17 pages | ✅ |
| 7 | No fake reviews/ratings in JSON-LD | `structured-data.ts` omits Review/AggregateRating | ✅ |
| 8 | `prefers-reduced-motion` honored | `globals.css` media query disables animations/smooth-scroll | ✅ |
| 9 | Modal background inert + focus management | `Modal.tsx` sets inert on siblings, focus trap, Escape; 4 a11y tests pass | ✅ |
| 10 | Game components CLS-safe + accessible | `GameImage` fixed dims, `ResultAnnouncer` aria-live, `TimelineControls` keyboard | ✅ |
| 11 | CI gates: typecheck/lint/test/content/build/e2e | `ci.yml` runs all 6; all pass locally | ✅ |
| 12 | Deploy fires only on CI success on main | `deploy.yml` uses `workflow_run` + `head_branch=='main'` | ✅ |
| 13 | No secrets / no PII / no fabricated data | Security review verified; `.env.example` only public var | ✅ |
| 14 | IP-safe content (no false attribution) | ss-001/ss-002 relabeled to `placeholder` this phase | ✅ |

---

## 3. Git diff review — unrelated changes & duplicate logic

**Unrelated changes:** None. The 27 files in `HEAD~6..HEAD` all map to phases 4e–4j + review. Working tree after acceptance fixes contains only the in-scope edits listed in §4.

**Duplicate logic found and fixed:**
- `subtractDays` — was duplicated in `client.ts:47` and `actions.ts:86`. Extracted to `src/storage/internal.ts`; both modules now import it.
- `dedupe` / `dedupeList` — was duplicated in `client.ts:104` and `actions.ts:56`. Consolidated to `dedupe` in `internal.ts`; `actions.ts` call site updated.
- `normalizeAnswer` — was divergent (`match.ts` folds internal whitespace; `validators.mjs` did not). `validators.mjs` now imports from `match.ts` (ADR-002 single source of truth).

---

## 4. In-scope fixes applied this phase (acceptance lead)

| Fix | Files | Rationale |
|-----|-------|-----------|
| AGENTS.md guardrails (13 rules, bilingual, enforceable) | `AGENTS.md` | Owner instruction; aligns with review P2-59/P2-60 |
| Extract shared storage helpers | new `src/storage/internal.ts`; edited `client.ts`, `actions.ts` | Review P2-52; guardrail #4 |
| Unify `normalizeAnswer` | `scripts/lib/validators.mjs` | Review P1-5; ADR-002 |
| Keywords schema `max(8)`→`max(6)` | `src/lib/content/schemas.ts` | Review P1-7; PRD §5.2 |
| Relabel placeholder attribution | `src/data/screenshot/ss-001.json`, `ss-002.json`, `src/app/about/page.tsx` | Review P0-1 |
| Correct SECURITY-REVIEW M-3 | `docs/SECURITY-REVIEW.md` | Review P2-11 (report accuracy) |

No new features were developed (per owner instruction "现在不要开发新功能"). All fixes are defect corrections or documentation accuracy.

---

## 5. Test coverage assessment — does it cover behavior?

**Genuinely behavioral (assertions on output/state, not `expect(true)`):**
- Storage: 84 tests with precise equality assertions on scores, streaks, daily maps, idempotency, no-downgrade, corruption recovery, quota pruning.
- `match.ts`: 21 tests cover normalize boundaries, empty/whitespace guesses, duplicate detection, wrong-guess dedup.
- Components: GameImage error fallback, ResultAnnouncer badge text, TimelineControls keyboard reorder + position label, ShareButton 3-tier fallback, Modal a11y focus.

**Honest gaps (carryover, not silently passed):**
- `loader.ts` has zero tests (P1-11) — recorded, deferred to 4d.
- `modeAvgScore` incremental recalc has no value assertion (P2-26) — recorded.
- e2e covers only homepage/keyboard/404 (P2-33) — recorded.
- Game components tested in isolation but wired into zero pages (P1-9) — expected for 4d-pending.

No failing test was deleted or weakened to get green CI (guardrail #6 honored).

---

## 6. Validation commands — real run results

All 6 commands executed after the acceptance fixes. No check marked pass without a real run.

| Command | Exit code | Result |
|---------|-----------|--------|
| `npm run typecheck` | 0 | clean |
| `npm run lint` | 0 | No ESLint warnings or errors |
| `npm run test` | 0 | 20 files, 203 tests passed |
| `npm run content:check` | 0 | 8/8 valid, 0 duplicates, 0 missing assets |
| `npm run test:e2e` | 0 | 3 passed (chromium) |
| `npm run build` | 0 | 17 static pages generated (Windows phantom-file fallback triggered; Linux CI unaffected) |

---

## 7. Carryover to Phase 4d

**Must fix before game goes live** (from `docs/testing/final-code-review.md`):

- **P0-1 (remaining):** replace placeholder `.webp` with verified IP-safe images.
- **P0-2:** create `public/og.png` (1200×630).
- **P1-1:** `saveState` write-time schema validation.
- **P1-2:** Modal `inert` via `createPortal`.
- **P1-3:** Modal accessible name + `useId()`.
- **P1-4:** mount `<ToastProvider>` (or remove `useToast`).
- **P1-6:** lock `given_up` as terminal.
- **P1-9:** wire game components into play pages.
- **P1-10:** next-clue preload + image compression tiers.
- **P1-11:** `loader.ts` tests.

These are Phase 4d scope, not acceptance blockers for 4e–4j. They are listed in `docs/STATUS.md` § Carryover.

---

## 8. Verdict

**PASS** for phases 4e–4j + review + acceptance scope.

Rationale: all acceptance criteria verified with real command output; duplicate logic removed; in-scope defects fixed with no regression (203 tests + 3 e2e green); no new features added; guardrails documented and enforced.

**Phase 4d does NOT start automatically.** Per AGENTS.md guardrail #13, the owner must explicitly approve advancement. The carryover P0/P1 list above is the recommended fix-on-wiring order for the Phase 4d engineer.

---

## 9. Suggested Conventional Commit

```
chore: phase 4e-4j acceptance and agent guardrails

Acceptance wrap-up for phases 4e-4j (storage, SEO, perf/a11y, QA,
security review, release pipeline) + final 8-subagent review.

In-scope fixes (no new features):
- AGENTS.md: add 13 enforceable Agent Guardrails (bilingual)
- storage: extract shared helpers to src/storage/internal.ts; remove
  duplicate subtractDays/dedupe from client.ts and actions.ts
- validators.mjs: import normalizeAnswer from match.ts (single source)
- schemas.ts: KeywordsPuzzleSchema max(8) -> max(6) per PRD §5.2
- ss-001/ss-002: relabel attribution to placeholder (remove false NASA)
- SECURITY-REVIEW.md: correct M-3 (vercel.json already ships 4 headers)

Validation (all real runs, post-fix): typecheck, lint, 203 unit tests,
content:check, 3 e2e, build — all green.

Verdict: PASS for 4e-4j. Phase 4d deferred (carryover P0/P1 in
docs/STATUS.md); does not auto-advance (AGENTS.md guardrail #13).
```
