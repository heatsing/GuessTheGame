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

No secrets or credentials entered the repository. The static, no-login, no-backend architecture keeps the attack surface small. The previously most important issue — **fabricated image attribution** (H-1) — is now **fully resolved**: both screenshot fixtures have been replaced with verified public-domain NASA images sourced from Wikimedia Commons, with per-file attribution set to the real license metadata (see H-1). The remaining Medium items are launch-time hardening (Privacy/Contact pages, CSP + clickjacking protection, answer-exposure honesty note).

---

## Critical

_None._

---

## High

### H-1. Fabricated image attribution on screenshot placeholders — RESOLVED

- **Location:** `src/data/screenshot/ss-001.json`, `src/data/screenshot/ss-002.json`; assets `public/images/puzzles/ss-001.webp`, `public/images/puzzles/ss-002.webp`
- **Status:** **Fully resolved (2026-07-26).** Both placeholder `.webp` files have been replaced with verified public-domain NASA images sourced from Wikimedia Commons. Per-file license metadata confirmed via the Wikimedia API `extmetadata` endpoint (`LicenseShortName: "Public domain"`). JSON fixtures now declare the real `imageLicense: "public-domain"` and a factual `imageAttribution` string naming the NASA unit and Wikimedia source file.
- **Resolution details:**
  - **ss-001 (Mount Everest):** Image `Mount_Everest_ISS008-E-6150.JPG` — NASA ISS Expedition 8 Crew, via NASA Earth Observatory ("The Many Faces of Mount Everest" gallery). Wikimedia Commons confirms Public domain. Processed to 960×540 WebP (79.1 KB, ≤80 KB cap). Attribution: `"NASA ISS Expedition 8 Crew — The Many Faces of Mount Everest (NASA Earth Observatory). Source: Wikimedia Commons (Mount_Everest_ISS008-E-6150.JPG)."`
  - **ss-002 (Sahara):** Image `Desert_Patterns_(5182689540).jpg` — NASA Goddard Space Flight Center, via Flickr. Wikimedia Commons confirms Public domain. Processed to 960×540 WebP (78.3 KB, ≤80 KB cap). Attribution: `"NASA Goddard Space Flight Center — Desert Patterns (via Flickr). Source: Wikimedia Commons (Desert_Patterns_(5182689540).jpg)."`
  - **Blur thumbnails regenerated:** `ss-001-blur.webp` (0.1 KB), `ss-002-blur.webp` (0.1 KB) — both within the ≤5 KB LQIP cap.
  - **Content validation:** `npm run content:check` passes — 8 puzzles valid, 0 missing assets, 0 oversized assets.
- **Original evidence (preserved for traceability):**
  - `ss-001.json` previously declared `"imageLicense": "public-domain"` and `"imageAttribution": "NASA, via Wikimedia Commons"` for a ~9.5 KB generated placeholder.
  - `ss-002.json` previously declared `"imageLicense": "public-domain"` and `"imageAttribution": "NASA Earth Observatory"` for a ~9.1 KB generated placeholder.
  - Phase 4l (2026-07-09) relabeled both to `"imageLicense": "placeholder"` to remove the false claim. Phase 4d close-out (2026-07-26) replaced the placeholder pixels with the real public-domain images documented above.
- **Future guardrail (still recommended):** a content-validation rule in `scripts/lib/validators.mjs` that rejects real-source names (NASA/Wikimedia/USGS) on assets still flagged `placeholder` would prevent the original misattribution from recurring if a future contributor adds a placeholder without updating the license field.

---

## Medium

### M-1. No Privacy page and no copyright/contact takedown path

- **Location:** `src/app/` (no `/privacy`, `/contact`, or `/terms` route); footer `src/components/layout/SiteFooter.tsx` links only to How to Play / About / Archive / Stats.
- **Evidence:** Glob for `src/app/{privacy,privacy-policy,contact,terms,copyright}/**` returned no matches. The About page (`src/app/about/page.tsx`) mentions localStorage usage in prose ("your streak, scores, and history live only in your browser via localStorage") but there is no dedicated, linkable privacy statement or a contact channel for copyright concerns.
- **Impact:** For a no-login, no-tracking static site the privacy risk is low, but a discoverable Privacy page is still expected (discloses localStorage data, retention windows, no-account model). More importantly, there is **no contact path for copyright inquiries/takedowns** — if a contributor accidentally adds a non-IP-safe asset, rights holders have no stated channel to report it.
- **Recommended fix:** Add `/privacy` (data-in-browser disclosure, retention: daily 60d / last30 30d / recent 20, export & reset available, no accounts, no analytics) and `/contact` (or a `mailto:` / GitHub Issues link) linked from the footer. Reference AGENTS.md's IP-safe constraint.

### M-2. Static answer exposure is an inherent, undisclosed limitation — RESOLVED

- **Location:** `src/data/{keywords,emoji,screenshot,timeline}/*.json` (answers: `target` + `aliases`); loaded at build time via `src/lib/content/loader.ts`; bundled into the static export. Disclosure added to `src/app/about/page.tsx`.
- **Status:** **Resolved (2026-07-26).** The About page now includes an explicit honor-system paragraph: "Like all browser-only puzzle games, the answers are bundled into the page itself — there is no server to hide them behind. The game runs on an honor system: no leaderboards, no anti-cheat, and your progress is yours alone." This sits directly beneath the existing architecture disclosure ("Puzzle data is bundled at build time as JSON…").
- **Evidence:** All puzzle answers live in JSON that is either inlined into client JS bundles or fetchable as static assets. A determined user can read answers via View Source / DevTools / fetching the JSON. This is now explicitly acknowledged to the player.
- **Impact:** Not a vulnerability — this is the unavoidable tradeoff of a static, no-backend game (same as Wordle-style clones). The honesty concern is now addressed.

### M-3. No Content-Security-Policy; no X-Frame-Options / frame-ancestors (clickjacking) — RESOLVED

- **Location:** `public/_headers` (Cloudflare Pages headers, copied to `out/_headers` by static export); `next.config.mjs` (no `headers()`).
- **Status:** **Resolved (Phase 4m, 2026-07-16).** `public/_headers` now ships a strict CSP and `X-Frame-Options: DENY` alongside the four pre-existing security headers. Verified 2026-07-26 against the built `out/` artifacts.
- **Current headers (`public/_headers`):**
  - `Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'`
  - `X-Frame-Options: DENY` (defense-in-depth alongside `frame-ancestors 'none'`)
  - `X-Content-Type-Options: nosniff`
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - `Permissions-Policy: camera=(), microphone=(), geolocation=(), interest-cohort=()`
  - `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`
- **CSP tightening analysis (2026-07-26):** The `'unsafe-inline'` in `script-src` was audited for possible removal. The built HTML (`out/index.html`) contains 11 inline `<script>` tags injected by Next.js App Router — these are RSC flight data (`self.__next_f.push([1,"..."])`) essential for React hydration. Their content is per-page and per-build, so neither `'sha256-...'` hashes nor per-request nonces are feasible for a static export (no server runtime to mint nonces). `'unsafe-inline'` in `script-src` is therefore the standard and unavoidable practice for Next.js static-export sites. `'unsafe-inline'` in `style-src` is required by the 335 React inline `style={...}` usages across 32 components. JSON-LD `<script type="application/ld+json">` is exempt from `script-src` per CSP spec and needs no special directive. **Conclusion: the current CSP is as strict as practical for this architecture.**
- **Original evidence (preserved for traceability):** An earlier draft of this report claimed `public/_headers` had no CSP or X-Frame-Options; that was accurate at review time (2026-07-09) but the gap was closed in Phase 4m (2026-07-16) when the CSP and `X-Frame-Options: DENY` were added.

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

The About page's "Content sources" and "IP-safe strategy" sections are well-intentioned, and their claims ("Screenshot mode uses public-domain images (such as from Wikimedia Commons and NASA)… Each image carries attribution metadata where its license requires it") are now **true** — both screenshot assets are verified public-domain NASA images with per-file attribution (H-1 resolved 2026-07-26).

---

## Recommended Action Priority

1. **H-1** (fabricated attribution) — **resolved (2026-07-26)**: placeholder `.webp` files replaced with verified public-domain NASA images from Wikimedia Commons; per-file attribution set to real license metadata.
2. **M-1** (Privacy + Contact pages) — add before production launch.
3. **M-3** (CSP + X-Frame-Options/frame-ancestors) — **resolved (Phase 4m, 2026-07-16)**: strict CSP + `X-Frame-Options: DENY` shipped in `public/_headers`; CSP tightening audited 2026-07-26 and confirmed as strict as practical for Next.js static export.
4. **M-2** (answer-exposure honesty note) — **resolved (2026-07-26)**: honor-system paragraph added to the About page.
5. **L-1 … L-4** — hardening, address opportunistically.

This review is read-only; no business implementation was modified.
