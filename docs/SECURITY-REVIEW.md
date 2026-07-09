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

No secrets or credentials entered the repository. The static, no-login, no-backend architecture keeps the attack surface small. The single most important issue is **fabricated image attribution**: screenshot fixtures declare NASA provenance for files that are actually generated placeholders, which would misrepresent material ownership if shipped as-is.

---

## Critical

_None._

---

## High

### H-1. Fabricated image attribution on screenshot placeholders

- **Location:** `src/data/screenshot/ss-001.json`, `src/data/screenshot/ss-002.json`; assets `public/images/puzzles/ss-001.webp`, `public/images/puzzles/ss-002.webp`
- **Evidence:**
  - `ss-001.json` declares `"imageLicense": "public-domain"` and `"imageAttribution": "NASA, via Wikimedia Commons"`.
  - `ss-002.json` declares `"imageLicense": "public-domain"` and `"imageAttribution": "NASA Earth Observatory"`.
  - The actual `ss-001.webp` is a ~9.5 KB generated placeholder: a solid navy background with the literal text `PLACEHOLDER / ss-001 Mount Everest / Replace with curated IP-safe WebP`. `ss-002.webp` is ~9.1 KB — likewise far too small to be a real satellite photo.
  - The Zod schema (`ScreenshotPuzzleSchema`) requires `imageLicense` and `imageAttribution` to be non-empty strings, so validation enforces *presence* but never *truth* of the provenance claim.
- **Impact:** The metadata asserts a specific real-world source (NASA) and license for assets the project does not actually hold under that license. This misrepresents material ownership/provenance — exactly the class of issue this review targets. If shipped, users and downstream reusers would rely on a false attribution. It also contradicts the About page's promise ("Screenshot mode uses public-domain images (such as from Wikimedia Commons and NASA)… Each image carries attribution metadata where its license requires it").
- **Recommended fix (read-only suggestion):**
  1. Replace placeholders with genuinely licensed images (public-domain NASA/Wikimedia files, verified per-file) **before** the screenshot mode goes live, and set `imageAttribution`/`imageLicense` to the real per-file values.
  2. Until then, mark placeholder fixtures explicitly — e.g. `"imageLicense": "placeholder"`, `"imageAttribution": "Generated placeholder — not a licensed asset"` — so no false provenance is recorded.
  3. Add a content-validation rule (in `scripts/lib/validators.mjs`) that rejects `imageAttribution` values containing known real-source names (NASA, Wikimedia, USGS, …) when the file is flagged as a placeholder, or that requires a `placeholder: true` boolean for generated assets.
  4. Optionally store a source URL per image so attribution can be verified, not just asserted.

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

### M-3. No Content-Security-Policy or security headers configured

- **Location:** `next.config.mjs` (no `headers()` configured); static export means headers are served by the host (Vercel), but no CSP is authored.
- **Evidence:** `nextConfig` sets only `output`, `images`, `trailingSlash`, `reactStrictMode`. No `Content-Security-Policy`, `X-Content-Type-Options`, `Referrer-Policy`, or `Permissions-Policy` headers are defined.
- **Impact:** Without a CSP, any future injection of inline script or third-party asset would execute without restriction. Currently low because the app injects no untrusted content and uses `dangerouslySetInnerHTML` only for hardcoded JSON-LD (`src/lib/structured-data.ts` — app-authored, not user input), but a CSP is cheap defense-in-depth and recommended before production.
- **Recommended fix:** Add a `headers()` block in `next.config.mjs` (or a `vercel.json`/`public/_headers` for the static host) with a strict CSP (`default-src 'self'; script-src 'self'; object-src 'none'; base-uri 'self'`), `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, and `Permissions-Policy` for unused features. Verify JSON-LD still renders (inline `<script type="application/ld+json">` requires `script-src 'self'` to allow it, or a nonce/hash).

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

1. **H-1** (fabricated attribution) — fix before any screenshot-mode content is exposed publicly; either ship verified assets or relabel placeholders.
2. **M-1** (Privacy + Contact pages) — add before production launch.
3. **M-3** (CSP/security headers) — add before production launch.
4. **M-2** (answer-exposure honesty note) — copy addition, low effort.
5. **L-1 … L-4** — hardening, address opportunistically.

This review is read-only; no business implementation was modified.
