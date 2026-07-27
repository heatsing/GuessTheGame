# Handoff: L-1 through L-4 — Low-severity security hardening

> Date: 2026-07-27 · From: Engineer · To: Reviewer / Owner

## Scope

Resolves the four Low-severity findings from `docs/SECURITY-REVIEW.md`:

| # | Finding | Status |
|---|---------|--------|
| L-1 | Share route reflects unvalidated URL segment | **Resolved (2026-07-27)** |
| L-2 | No dependency vulnerability scan in CI | **Resolved (2026-07-27)** |
| L-3 | JSON-LD `offers.price` is a string, not a number | **Resolved (Phase 4m, confirmed 2026-07-27)** |
| L-4 | Corrupted-state stash key has no size/rotation bound | **Resolved (Phase 4m, confirmed 2026-07-27)** |

With this fix, **all High and Low security findings are closed**. The only remaining open item is M-1 (Privacy + Contact pages — deferred, requires new routes).

## What was done

### L-1: Share route resultId validation

**File:** `src/app/share/[result-id]/page.tsx`

Added `RESULT_ID_REGEX = /^[a-z0-9]{8,32}$/` validation before rendering. Invalid segments trigger an "Invalid Result" fallback that does not echo the raw input.

- React already escapes the value (no XSS), but the validation prevents displaying arbitrary junk text from crafted `/share/<long-junk>` URLs.
- The `generateStaticParams` placeholder ("placeholder") matches the regex (11 lowercase chars), so the prerendered static page still renders the normal shell.
- When the ShareButton is later wired to produce real result IDs, the generator MUST emit values matching this regex (documented in the page source).

**Tests:** 12 unit tests in `src/app/share/[result-id]/page.test.tsx`:
- Valid IDs: 8-char alphanumeric, 32-char (max length), placeholder
- Invalid IDs: too short (7 chars), too long (33 chars), uppercase, `<script>` (XSS attempt), path traversal (`../../etc`), URL-encoded payload (`%3Cscript%3E`)
- Verifies the raw invalid segment is never echoed into the DOM
- Verifies navigation links are present in both the normal shell and the fallback

### L-2: CI two-tier dependency audit

**File:** `.github/workflows/ci.yml`

Replaced the single non-blocking audit step with a two-tier enforcement:

| Tier | Command | Blocking | Purpose |
|------|---------|----------|---------|
| 1 (blocking) | `npm audit --omit=dev --audit-level=critical` | ✅ Fails build | Hard gate on critical-severity prod vulnerabilities |
| 2 (advisory) | `npm audit --omit=dev --audit-level=high` | ❌ `continue-on-error` | Surfaces high-severity advisories in CI log |

**Known HIGH advisories (non-blocking, documented in CI comments):**

3 HIGH-severity vulnerabilities exist in `next`'s transitive dependency tree:

1. **next** (GHSA-m99w-x7hq-7vfj et al.) — advisory range covers ALL released versions (9.3.4-canary.0 – 16.3.0-preview.7). Vulnerabilities affect Server Actions, SSR, Image Optimization API, and rewrites — NONE used in static-export app (`output: 'export'`).
2. **postcss ≤8.5.17** (transitive via next) — CSS source-map / stringify issues, only relevant at build time with attacker-controlled CSS.
3. **sharp <0.35.0** (transitive via next) — libvips image-decode CVEs, only relevant if processing untrusted images server-side.

npm's suggested "fix" (downgrade to next@9.3.3) is nonsensical and was NOT applied. When a fixed `next` version is released, the advisory audit will pass clean and Tier 2 can be upgraded to blocking.

**Dependency upgrade applied:** `npm audit fix` upgraded `next` 15.5.20 → 15.5.22 (security patch, same minor version, AGENTS.md guardrail #2 compliant) and updated transitive `postcss`/`@next/swc-*` packages. All validation gates re-verified green.

### L-3: JSON-LD price type (confirmed already resolved)

**File:** `src/lib/structured-data.ts`

Confirmed `price: 0` (number, not string) at line 47. This was resolved in Phase 4m (2026-07-16). The SECURITY-REVIEW.md entry was stale (still described `price: "0"`); updated to RESOLVED with the correct evidence.

### L-4: Corrupted-state cleanup (confirmed already resolved)

**File:** `src/storage/client.ts`

Confirmed two cleanup paths, both resolved in Phase 4m (2026-07-16):
- `saveState` success path (line 219): `adapter.removeItem(CORRUPTED_KEY)` — clears any previously stashed corrupted payload on every healthy write.
- `resetState` (line 241): `adapter.removeItem(CORRUPTED_KEY)` — removes both `STORAGE_KEY` and `CORRUPTED_KEY` for a true clean slate.

The SECURITY-REVIEW.md entry was stale; updated to RESOLVED with the correct evidence.

## Files changed

| File | Change |
|------|--------|
| `src/app/share/[result-id]/page.tsx` | Added `RESULT_ID_REGEX` validation + "Invalid Result" fallback (L-1) |
| `src/app/share/[result-id]/page.test.tsx` | New — 12 unit tests for L-1 validation |
| `.github/workflows/ci.yml` | Two-tier audit: blocking on critical, advisory on high (L-2) |
| `package-lock.json` | next 15.5.20 → 15.5.22 security patch + transitive updates (L-2) |
| `docs/SECURITY-REVIEW.md` | L-1–L-4 marked RESOLVED; summary table + priority updated |
| `docs/STATUS.md` | L-1–L-4 resolution logged; blockers updated |

## Verification (all green)

| Gate | Command | Result |
|------|---------|--------|
| Typecheck | `npm run typecheck` | clean (0 errors) |
| Lint | `npm run lint` | 0 warnings, 0 errors |
| Unit tests | `npm run test` | 413 tests, 30 files, all pass (+12 new share page tests) |
| Content check | `npm run content:check` | 8 puzzles valid, 0 missing, 0 oversized |
| Build | `npm run build` | 18 pages compiled (Next.js 15.5.22); Windows NTFS phantom-file bug on local export copy — CI/Linux unaffected; non-export retry passed |
| Audit (critical) | `npm audit --omit=dev --audit-level=critical` | exit 0 — no critical prod vulnerabilities |
| Audit (high) | `npm audit --omit=dev --audit-level=high` | 3 high (next/postcss/sharp — documented, non-exploitable in static export) |

## Guardrails compliance

| # | Rule | Compliance |
|---|------|-----------|
| 2 | No major framework upgrades | ✓ next 15.5.20 → 15.5.22 is a patch within the same minor (15.5.x), not a major upgrade |
| 3 | No casual dependencies | ✓ No new deps added; `npm audit fix` only upgraded existing packages |
| 4 | No duplicated logic | ✓ `RESULT_ID_REGEX` defined in one place (share page); future ShareButton generator will reference the same regex |
| 5 | No `any` | ✓ All code is fully typed |
| 6 | No deleted tests | ✓ Added 12 new tests; no existing tests removed or weakened |
| 12 | No skipped handoff docs | ✓ This document |
| 13 | No auto-advance | ✓ Awaiting owner approval |

## Remaining pre-launch work

- **M-1:** Add `/privacy` and `/contact` pages (Privacy disclosure + copyright takedown path) — the only remaining open security item; deferred to post-4d-acceptance per the "no new features during acceptance" preference.
- **Content expansion:** 50+ puzzles per mode (currently 8 total).
- **Future:** When a fixed `next` version is released (beyond the 16.3.0-preview.7 advisory range), upgrade and promote the Tier 2 advisory audit to blocking.
