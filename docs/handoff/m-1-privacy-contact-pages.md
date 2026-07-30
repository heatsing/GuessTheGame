# Handoff: M-1 — Privacy + Contact pages

> Date: 2026-07-30 · From: Engineer · To: Reviewer / Owner

## Scope

Resolves the final open security finding from `docs/SECURITY-REVIEW.md`:

| # | Finding | Status |
|---|---------|--------|
| M-1 | No Privacy page and no copyright/contact takedown path | **Resolved (2026-07-30)** |

With this fix, **all security findings (H-1, M-1, M-2, M-3, L-1 through L-4) are closed**. The security review is fully green.

## What was done

### `/privacy` — Privacy disclosure page

**File:** `src/app/privacy/page.tsx`

A dedicated, linkable privacy statement. Documents the no-account, no-analytics, no-ads model and exactly what is stored in `localStorage`. All retention claims cross-reference the authoritative sources so the page cannot drift from the implementation:

- **No accounts, no tracking:** no login, no user identifier, no analytics/ads/third-party tracking scripts, no cookies, no PII (name, email, IP, device ID) ever collected or transmitted. Static build — puzzle data bundled at build time, progress never leaves the browser.
- **What is stored and where:** single `localStorage` key `gtg:state:v1` holding daily progress, streak, stats, settings, completed/recent puzzle IDs, achievements. Cross-references `src/storage/keys.ts` (`STORAGE_KEY`) and `src/storage/types.ts` (`PersistedState` shape).
- **Retention:** daily progress 60d (`DAILY_RETENTION_DAYS`), heatmap 30d (`LAST30_RETENTION`), recently played 20 (`RECENT_PUZZLES_CAP`), soft quota <80KB (`SOFT_QUOTA_BYTES`). Pruned automatically on every `saveState`.
- **In-memory fallback:** when `localStorage` is unavailable (e.g. Safari private mode), the site degrades to in-memory storage cleared on tab close.
- **Export and reset:** data lives only in the browser; users clear it via browser site-data controls (remove `gtg:state:v1` or clear all site data). No cloud copy to restore from.
- **Content and copyright:** points to `/contact` for takedown inquiries.

### `/contact` — Contact and takedown channel

**File:** `src/app/contact/page.tsx`

Designates GitHub Issues as the single monitored contact channel:

- **Bugs and feature requests:** instructions to open a GitHub Issue with mode, UTC date, browser, and reproduction steps.
- **Copyright and takedown inquiries:** explicit takedown path with a `copyright` issue label and a checklist (puzzle ID/page URL, original work + rights holder, contact method). Explains that removal happens in the next static deployment, not a runtime backend.
- **Privacy questions:** points back to `/privacy`; fallback to a `privacy` issue label.
- **What to expect:** no guaranteed response window, no email/phone channel, GitHub Issues is the only monitored path. Sensitive security reports routed to private GitHub Security Advisories.
- **External link safety:** every external anchor (to the GitHub repo) uses `target="_blank"` + `rel="noopener noreferrer"` to prevent tab-nabbing and Referrer leakage — the first external links in `src/`, audited in the SECURITY-REVIEW.md External Link Safety section.

### Footer links

**File:** `src/components/layout/SiteFooter.tsx`

Added `Privacy` and `Contact` to the `footerLinks` array alongside How to Play / About / Archive / Stats.

### Sitemap

**File:** `src/app/sitemap.ts`

Added `/privacy` (priority 0.3, `yearly`) and `/contact` (priority 0.3, `yearly`). Bumped `SITE_LAST_MODIFIED` from `2026-07-16` to `2026-07-30` (indexable page content changed — per the file's own rule: "Bump on real edits").

### Page metadata

**File:** `src/lib/site-config.ts`

`PAGE_METADATA.privacy` and `PAGE_METADATA.contact` entries (added in the prior session) provide the title, description, and canonical path consumed by `buildPageMetadata`.

## Files changed

| File | Change |
|------|--------|
| `src/app/privacy/page.tsx` | New — privacy disclosure page |
| `src/app/contact/page.tsx` | New — contact / takedown channel page |
| `src/components/layout/SiteFooter.tsx` | Added Privacy + Contact links to footer nav |
| `src/app/sitemap.ts` | Added `/privacy` + `/contact` entries; bumped `SITE_LAST_MODIFIED` to 2026-07-30 |
| `src/lib/site-config.ts` | `PAGE_METADATA.privacy`/`.contact` metadata entries (prior session) |
| `docs/SECURITY-REVIEW.md` | M-1 marked RESOLVED; summary table (Medium: 0); External Link Safety section updated; Copyright/Privacy/Contact table updated; priority list + closing line updated |
| `docs/STATUS.md` | M-1 resolution logged; Blockers updated; Next Actions updated (M-1 removed) |
| `docs/testing/phase-4d-acceptance-review.md` | M-1 marked RESOLVED in security table; verdict + remaining-work sections updated |
| `docs/testing/final-code-review.md` | P2-14 / M-1 resolution added to "Fixes Applied" |
| `docs/handoff/m-1-privacy-contact-pages.md` | New — this handoff |

## Verification (all green)

| Gate | Command | Result |
|------|---------|--------|
| Typecheck | `npm run typecheck` | clean (0 errors) |
| Lint | `npm run lint` | 0 warnings, 0 errors |
| Unit tests | `npm run test` | 413 tests, 30 files, all pass (no regressions) |
| Content check | `npm run content:check` | 8 puzzles valid, 0 missing, 0 oversized |
| Build | `npm run build` | Compiled successfully; 20/20 static pages generated (+2 vs. prior 18 — `/privacy` and `/contact`). Windows NTFS phantom-file bug on local export copy — CI/Linux unaffected. |

## Guardrails compliance

| # | Rule | Compliance |
|---|------|-----------|
| 1 | No developing the whole site in one shot | ✓ Two small pages + footer/sitemap wiring — a reviewable slice |
| 2 | No major framework upgrades | ✓ No framework changes |
| 3 | No casual dependencies | ✓ No new deps |
| 4 | No duplicated logic | ✓ External-link props consolidated into one `externalLinkProps` object; metadata via the shared `PAGE_METADATA` + `buildPageMetadata` pattern |
| 5 | No `any` | ✓ All code fully typed |
| 6 | No deleted tests | ✓ No tests removed; existing 413 pass unchanged |
| 7 | No fabricated APIs/databases | ✓ Static pages only — no backend, no API, no DB |
| 9 | No scattered localStorage | ✓ Privacy page *documents* localStorage but does not access it; no new storage calls |
| 10 | No thin SEO pages | ✓ `/privacy` and `/contact` carry real, unique content; added to sitemap with honest `yearly` change frequency |
| 12 | No skipped handoff docs | ✓ This document |
| 13 | No auto-advance | ✓ Awaiting owner approval |

## Remaining pre-launch work

- **Content expansion:** 50+ puzzles per mode (currently 8 total).
- **Deploy workflow:** fix the failing Deploy workflow (Cloudflare `apiToken` secret not configured — unrelated to this work).
- **Future:** When a fixed `next` version is released (beyond the 16.3.0-preview.7 advisory range), upgrade and promote the CI Tier 2 advisory audit to blocking.
