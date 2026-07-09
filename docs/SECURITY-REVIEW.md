# Security, Privacy & Copyright Review

**Date:** 2026-07-09
**Mode:** Read-only review (no business logic rewritten)
**Scope:** Secrets, credentials, env exposure, input rendering, URL/share injection, localStorage PII, analytics/ads privacy, external link safety, dependency risk, image provenance & ownership, legal pages, misleading ownership claims, fabricated stats/ratings, static answer exposure honesty.

---

## Summary

| Severity | Count |
|----------|-------|
| Critical | 0 |
| High | 1 |
| Medium | 3 |
| Low | 4 |
| Informational | 7 |

No secrets or credentials entered the repository. The static, no-login, no-backend architecture keeps the attack surface small. The single most important issue is **fabricated image attribution**: screenshot fixtures declared NASA provenance for files that are actually generated placeholders — this has now been corrected in-code by relabeling the fixtures as `imageLicense: "placeholder"` (see H-1). The remaining Medium items are launch-time hardening (Privacy/Contact pages, CSP + clickjacking protection, answer-exposure honesty note).

---

## Critical

_None._

---

## High

### H-1. Fabricated image attribution on screenshot placeholders — CORRECTED

- **Location:** `src/data/screenshot/ss-001.json`, `src/data/screenshot/ss-002.json`; assets `public/images/puzzles/ss-001.webp`, `public/images/puzzles/ss-002.webp`
- **Status:** **Corrected in-code this phase (2026-07-09).** Both fixtures now declare `"imageLicense": "placeholder"` and `"imageAttribution": "Generated placeholder — not a licensed asset. Replace with a verified IP-safe public-domain image before screenshot mode ships."` The false NASA provenance has been removed.
- **Original evidence (preserved for traceability):**
  - `ss-001.json` previously declared `"imageLicense": "public-domain"` and `"imageAttribution": "NASA, via Wikimedia Commons"`.
  - `ss-002.json` previously declared `"imageLicense": "public-domain"` and `"imageAttribution": "NASA Earth Observatory"`.
  - The actual `ss-001.webp` is a ~9.5 KB generated placeholder; `ss-002.webp` is ~9.1 KB — far too small to be real satellite photos.
- **Remaining action before screenshot mode goes live:** replace the placeholder `.webp` files with genuinely licensed images (public-domain NASA/Wikimedia files, verified per-file) and set `imageAttribution`/`imageLicense` to the real per-file values, OR keep the `placeholder` label until then. A content-validation rule in `scripts/lib/validators.mjs` rejecting real-source names (NASA/Wikimedia/USGS) on placeholder-flagged assets is still recommended as a future guardrail.

---

## Medium

### M-1. No Privacy page and no copyright/contact takedown path

- **Location:** `src/app/` (no `/privacy`, `/contact`, or `/terms` route); footer `src/components/layout/SiteFooter.tsx` links only to How to Play / About / Archive / Stats.
- **Evidence:** Glob for `src/app/{privacy,privacy-policy,contact,terms,copyright}/**` returned no matches. The About page (`src/app/about/page.tsx`) mentions localStorage usage in prose ("your streak, scores, and history live only in your browser via localStorage") but there is no dedicated, linkable privacy statement or a contact channel for copyright concerns.
- **Impact:** For a no-login, no-tracking static site the privacy risk is low, but a discoverable Privacy page is still expected (discloses localStorage data, retention windows, no-account model). More importantly, there is **no contact path for copyright inquiries/takedowns** — if a contributor accidentally adds a non-IP-safe asset, rights holders have no stated channel to report it.
- **Recommended fix:** Add `/privacy` (data-in-browser disclosure, retention: daily 60d / last30 30d / recent 20, export & reset available, no accounts, no analytics) and `/contact` (or a `mailto:` / GitHub Issues link) linked from the footer. Reference AGENTS.md's IP-safe constraint.

### M-2. Static answer exposure is an inherent, undisclosed limitation

- **Location:** `src/data/{keywords,emoji,screenshot,timeline}/*.json` (answers: `target` + `aliases`); loaded at build time via `src/lib/content/loader.ts`; bundled into the static export.
- **Evidence:** All puzzle answers live in JSON that is either inlined into client JS bundles or fetchable as static assets. A determined user can read answers via View Source / DevTools / fetching the JSON. The About page states "Puzzle data is bundled at build time as JSON" (honest about architecture) but does not explicitly acknowledge that answers are therefore client-visible.
- **Impact:** Not a vulnerability — this is the unavoidable tradeoff of a static, no-backend game (same as Wordle-style clones). The concern is *honesty*: the product should not imply answers are server-protected. Low real-world risk because the game is single-player and honor-system.
- **Recommended fix:** Add a short note to `/how-to-play` or About acknowledging that, like all browser-only puzzle games, answers are present in the page bundle and the game runs on an honor system. No code change required; this is a copy/trust clarification.

### M-3. No Content-Security-Policy; no X-Frame-Options / frame-ancestors (clickjacking)

- **Location:** `public/_headers` (Cloudflare Pages headers, copied to `out/_headers` by static export); `next.config.mjs` (no `headers()`).
- **Evidence:** `public/_headers` **does** configure four security headers — `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` (incl. `interest-cohort=()`), and `Strict-Transport-Security` (HSTS preload). An earlier draft of this report incorrectly claimed no security headers were configured; that was inaccurate and has been corrected. (The headers were previously in `vercel.json`; they migrated to `public/_headers` when the deployment target switched from Vercel to Cloudflare Pages.) The real remaining gap is the absence of a `Content-Security-Policy` and any `X-Frame-Options` / `frame-ancestors` directive.
- **Impact:** Without a CSP, any future injection of inline script or third-party asset would execute without restriction. Without `frame-ancestors`/`X-Frame-Options`, the static pages can be embedded in arbitrary iframes (clickjacking). Currently low because the app injects no untrusted content and uses `dangerouslySetInnerHTML` only for hardcoded JSON-LD (`src/lib/structured-data.ts` — app-authored, not user input), but both are cheap defense-in-depth and recommended before production.
- **Recommended fix:** Add a strict CSP (`default-src 'self'; script-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'self'`) to `public/_headers`. Inline JSON-LD `<script type="application/ld+json">` is allowed under `script-src 'self'` (it is not inline event handler / eval). Verify JSON-LD still renders after the CSP lands.
- **Severity note:** Downgraded from the original "no security headers" framing to a focused Low-equivalent gap (kept as Medium here only because CSP + clickjacking protection is a launch-time recommendation, not a current vulnerability).

---

## Low

### L-1. Share route reflects unvalidated URL segment

- **Location:** `src/app/share/[result-id]/page.tsx` — `{resultId}` rendered into a `<p>`.
- **Evidence:** `resultId` comes from the route param and is rendered directly. React auto-escapes, so there is **no XSS**. However the value is not validated against an expected format (e.g. a result-ID alphabet/length) before rendering. In `next dev` arbitrary segments render; under `output: 'export'` only `generateStaticParams` paths ("placeholder") are prerendered, so unknown segments 404 in production.
- **Impact:** Minimal — no script execution. At most, a crafted `/share/<long-junk>` URL would display junk text in dev/preview.
- **Recommended fix:** Validate `resultId` against a strict regex (e.g. `^[a-z0-9]{8,32}$`) and render a sanitized/fallback label otherwise; or display a generic "Shared Result" heading without echoing the raw ID.

### L-2. No dependency vulnerability scan in CI

- **Location:** `package.json` scripts; no `npm audit` / `pnpm audit` step.
- **Evidence:** Dependencies are minimal and mainstream (`next`, `react`, `react-dom`, `zod` + standard dev tooling). No supply-chain scan is wired into the build gate.
- **Impact:** Low today (small, reputable dep tree), but a known-vulnerable transitive dep would not be caught automatically.
- **Recommended fix:** Add an `audit` step (`npm audit --omit=dev --audit-level=high`) to CI, or enable Dependabot. Non-blocking on warnings, blocking on `high`/`critical`.

### L-3. JSON-LD `offers.price` is a string, not a number

- **Location:** `src/lib/structured-data.ts` — `webApplicationSchema()` sets `offers: { price: "0", priceCurrency: "USD" }`.
- **Evidence:** schema.org `Offer.price` expects a Number or numeric string; `"0"` is accepted but `"0.00"` style is more conventional. This is a correctness/structured-data nit, not a security issue.
- **Impact:** Negligible. Could cause some rich-result validators to flag the price representation.
- **Recommended fix:** Use `price: 0` (number) or `"0.00"`. Purely cosmetic for SEO validation.

### L-4. Corrupted-state stash key has no size/rotation bound

- **Location:** `src/storage/client.ts` — `CORRUPTED_KEY = STORAGE_KEY + ":corrupted"`; `loadState` writes the raw corrupted string there on parse failure.
- **Evidence:** On JSON corruption the raw string is copied to `:corrupted` "best-effort". If corruption recurs repeatedly (e.g. a buggy extension mangling localStorage), the stash is overwritten each time (no history) and is never cleaned up automatically.
- **Impact:** Low — at most one stale corrupted blob lingers in localStorage; it does not contain PII (only game state). Not a privacy issue, just minor hygiene.
- **Recommended fix:** Optional: clear `:corrupted` on a successful `saveState`, or cap its size. Document that `resetState()` (the "clear my data" UI) should also remove `:corrupted`.

---

## Informational

- **I-1. No secrets or credentials in repo.** `git log --all -S` scan for `api_key`, `secret`, `password`, `BEGIN PRIVATE` returned no matches. No `.env*` files are committed (`.gitignore` covers `.env*.local`). `NEXT_PUBLIC_SITE_URL` is the only public env var and defaults to a non-sensitive `example.com` placeholder. ✅ Compliant.

- **I-2. NEXT_PUBLIC contains no sensitive information.** Only `NEXT_PUBLIC_SITE_URL` is consumed (`src/lib/site-config.ts`), used solely to build canonical/OG URLs. No tokens, keys, or user data are exposed via `NEXT_PUBLIC_*`. ✅ Compliant.

- **I-3. User input is safely rendered.** Apart from L-1 (echoed route param, React-escaped), the app renders no user-supplied free text. `dangerouslySetInnerHTML` is used **only** for app-authored JSON-LD (`src/components/seo/JsonLdScript.tsx` ← `serializeJsonLd` of hardcoded schema objects), never for user content. ✅ Compliant.

- **I-4. No URL/share-text injection.** `ShareButton` (`src/components/game/ShareButton.tsx`) shares app-generated text via `navigator.share`/`clipboard.writeText`; the payload is not derived from untrusted input. `canonicalUrl`/`absoluteUrl` build URLs from `SITE_CONFIG.url` + a path, with no user-controlled host. ✅ Compliant.

- **I-5. localStorage stores no unnecessary personal information.** `PersistedState` (`src/storage/types.ts`) holds only game state: daily progress, streak, stats, settings, completed/recent puzzle IDs, achievements, and `wrongGuesses` (game content, not PII). No userId, email, IP, name, or device identifiers. Retention is bounded (daily 60d, last30 30d, recent 20). ✅ Compliant with AGENTS.md "no fabricated player data".

- **I-6. No analytics or advertising.** Grep for `analytics|gtag|google(?!Bot)|script.*src` found only schema.org `@context` URLs and the `googleBot` robots directive. The site's "no ads, no login" claim is accurate. Because there is no tracking, no analytics privacy disclosure is legally required — though a Privacy page (M-1) is still recommended to document the localStorage usage. ✅ Compliant.

- **I-7. No fabricated statistics or ratings.** `structured-data.ts` deliberately omits `Review`/`AggregateRating` (commented intent). The Stats page is `noindex` and shows only the player's own local data. AGENTS.md forbids fake leaderboards/synthetic user counts, and none exist. ✅ Compliant.

---

## External Link Safety

No external links (`target="_blank"` or otherwise) exist in `src/`. The footer and header link only to internal routes. The About page mentions "Wikimedia Commons and NASA" in prose but does not link to them. Therefore there is **no `rel="noopener noreferrer"` gap** today. Recommendation: when external links are later added (e.g. per-image source URLs from H-1), always pair `target="_blank"` with `rel="noopener noreferrer"`.

---

## Copyright, Privacy, Contact Pages

| Page | Status |
|------|--------|
| `/about` | Exists — documents static/no-login model, IP-safe strategy, content sources |
| `/privacy` | **Missing** (see M-1) |
| `/contact` | **Missing** (see M-1) |
| `/terms` | Not required for a no-account static game, optional |

The About page's "Content sources" and "IP-safe strategy" sections are well-intentioned, but their claims ("Screenshot mode uses public-domain images (such as from Wikimedia Commons and NASA)… Each image carries attribution metadata where its license requires it") are currently **not true of the placeholder assets** (H-1). The copy should either be made true by shipping verified assets, or softened to acknowledge placeholders during development.

---

## Recommended Action Priority

1. **H-1** (fabricated attribution) — **corrected in-code this phase**: fixtures relabeled to `imageLicense: "placeholder"`. Verified assets must still replace placeholders before screenshot mode ships publicly.
2. **M-1** (Privacy + Contact pages) — add before production launch.
3. **M-3** (CSP + X-Frame-Options/frame-ancestors) — add before production launch (note: `vercel.json` already ships 4 other security headers).
4. **M-2** (answer-exposure honesty note) — copy addition, low effort.
5. **L-1 … L-4** — hardening, address opportunistically.

This review is read-only; no business implementation was modified.
