# Security, Privacy & Copyright Review

**Date:** 2026-07-09
**Mode:** Read-only review (no business logic rewritten)
**Scope:** Secrets, credentials, env exposure, input rendering, URL/share injection, localStorage PII, analytics/ads privacy, external link safety, dependency risk, image provenance & ownership, legal pages, misleading ownership claims, fabricated stats/ratings, static answer exposure honesty.

---

## Summary

| Severity | Count |
|----------|-------|
| Critical | 0 |
| High | 0 (all resolved) |
| Medium | 0 (all resolved) |
| Low | 0 (all resolved) |
| Informational | 7 |

No secrets or credentials entered the repository. The static, no-login, no-backend architecture keeps the attack surface small. All previously identified findings are now **fully resolved**: H-1 (fabricated image attribution), M-1 (Privacy + Contact pages), M-2 (answer-exposure honesty note), M-3 (CSP + X-Frame-Options), L-1 (share route validation), L-2 (CI dependency scan), L-3 (JSON-LD price type), and L-4 (corrupted-state cleanup). The security review is now fully green.

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

### M-1. No Privacy page and no copyright/contact takedown path — RESOLVED

- **Location:** `src/app/privacy/page.tsx`, `src/app/contact/page.tsx`, footer `src/components/layout/SiteFooter.tsx`, sitemap `src/app/sitemap.ts`.
- **Status:** **Resolved (2026-07-30).** Two new routes shipped and linked from the footer:
  - **`/privacy`** — discloses the no-account, no-analytics, no-ads model; lists exactly what `localStorage` holds under `gtg:state:v1` (daily progress, streak, stats, settings, completed/recent puzzle IDs, achievements); documents retention windows (daily 60d, heatmap 30d, recent 20); explains the Safari-private-mode in-memory fallback; and points to the contact page for takedown inquiries. All retention claims cross-reference `src/storage/keys.ts` and `src/storage/types.ts`.
  - **`/contact`** — designates GitHub Issues as the monitored contact channel for bug reports, feature requests, privacy questions, and copyright/takedown inquiries. External links use `target="_blank"` + `rel="noopener noreferrer"` per the External Link Safety section below. Sensitive security reports are routed to private GitHub Security Advisories rather than public Issues.
  - **Footer:** `SiteFooter.tsx` now links Privacy and Contact alongside How to Play / About / Archive / Stats.
  - **Sitemap:** `sitemap.ts` adds `/privacy` (priority 0.3, `yearly`) and `/contact` (priority 0.3, `yearly`); `SITE_LAST_MODIFIED` bumped to 2026-07-30.
- **Original evidence (preserved for traceability):** Glob for `src/app/{privacy,privacy-policy,contact,terms,copyright}/**` previously returned no matches. The About page mentioned localStorage usage in prose but there was no dedicated, linkable privacy statement or a contact channel for copyright concerns.
- **Impact closed:** For a no-login, no-tracking static site the privacy risk was low, but a discoverable Privacy page is now in place. More importantly, the missing contact path for copyright inquiries/takedowns is now filled — if a contributor accidentally adds a non-IP-safe asset, rights holders have a stated channel to report it.

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

### L-1. Share route reflects unvalidated URL segment — RESOLVED

- **Location:** `src/app/share/[result-id]/page.tsx` — `{resultId}` rendered into a `<p>`.
- **Status:** **Resolved (2026-07-27).** The share page now validates `resultId` against a strict regex `^[a-z0-9]{8,32}$` before rendering. Values outside this alphabet/length trigger an "Invalid Result" fallback that does not echo the raw segment. 12 unit tests cover valid IDs (8-char, 32-char, placeholder), invalid IDs (too short, too long, uppercase, `<script>`, path traversal, URL-encoded payloads), and verify the raw segment is never echoed into the DOM.
- **Evidence:** `resultId` comes from the route param and was previously rendered directly. React auto-escapes, so there was **no XSS**. However the value was not validated against an expected format before rendering. In `next dev` arbitrary segments rendered; under `output: 'export'` only `generateStaticParams` paths ("placeholder") are prerendered, so unknown segments 404 in production. The validation is now defense-in-depth for dev/preview and production.
- **Implementation:** `RESULT_ID_REGEX = /^[a-z0-9]{8,32}$/` defined in the page module. When the ShareButton is later wired to produce real result IDs, the generator MUST emit values matching this regex (documented in the page source).

### L-2. No dependency vulnerability scan in CI — RESOLVED

- **Location:** `.github/workflows/ci.yml` — dependency audit steps.
- **Status:** **Resolved (2026-07-27).** CI now runs a two-tier dependency audit:
  - **Tier 1 (blocking):** `npm audit --omit=dev --audit-level=critical` — fails the build on any CRITICAL-severity vulnerability in production dependencies. Verified to exit 0 with the current dependency tree.
  - **Tier 2 (advisory):** `npm audit --omit=dev --audit-level=high` with `continue-on-error: true` — surfaces HIGH-severity advisories in the CI log without blocking the gate.
- **Known HIGH advisories (non-blocking, documented in CI comments):** 3 HIGH-severity vulnerabilities exist in `next`'s transitive dependency tree (postcss ≤8.5.17, sharp <0.35.0) and in `next` itself (GHSA-m99w-x7hq-7vfj et al.). The `next` advisory range (9.3.4-canary.0 – 16.3.0-preview.7) covers ALL released versions — no fixed version exists yet. The vulnerabilities affect Server Actions, SSR, Image Optimization API, and rewrites, NONE of which are used in a static-export app (`output: 'export'`, no server runtime). npm's suggested "fix" (downgrade to next@9.3.3) is nonsensical and was not applied. When a fixed `next` version is released, the advisory audit will pass clean and Tier 2 can be upgraded to blocking.
- **Dependency upgrade applied:** `npm audit fix` upgraded `next` 15.5.20 → 15.5.22 (security patch, same minor version, compliant with AGENTS.md guardrail #2) and updated transitive `postcss`/`@next/swc-*` packages. All validation gates re-verified green after the upgrade.
- **Original evidence:** Dependencies are minimal and mainstream (`next`, `react`, `react-dom`, `zod` + standard dev tooling). The supply-chain scan is now wired into the build gate with two-tier enforcement.

### L-3. JSON-LD `offers.price` is a string, not a number — RESOLVED

- **Location:** `src/lib/structured-data.ts` — `webApplicationSchema()` sets `offers: { price: 0, priceCurrency: "USD" }`.
- **Status:** **Resolved (Phase 4m, 2026-07-16).** The `price` field is now a number (`0`), not a string (`"0"`). schema.org `Offer.price` accepts both Number and numeric string; the number form is the conventional representation and passes all rich-result validators.
- **Original evidence:** An earlier version of `webApplicationSchema()` set `price: "0"` (string). This was a correctness/structured-data nit, not a security issue.

### L-4. Corrupted-state stash key has no size/rotation bound — RESOLVED

- **Location:** `src/storage/client.ts` — `CORRUPTED_KEY = STORAGE_KEY + ":corrupted"`; `loadState` writes the raw corrupted string there on parse failure.
- **Status:** **Resolved (Phase 4m, 2026-07-16).** `saveState` now clears the `:corrupted` key on every successful write (line 219: `adapter.removeItem(CORRUPTED_KEY)`), so a healthy write removes any previously stashed corrupted payload. `resetState()` (the "clear my data" UI) also removes both `STORAGE_KEY` and `CORRUPTED_KEY` (line 241), providing a true clean slate. The stash is still best-effort (never overwrites the primary key) and contains only game state (no PII).
- **Original evidence:** On JSON corruption the raw string was copied to `:corrupted` "best-effort" but was never cleaned up automatically. If corruption recurred repeatedly, a stale corrupted blob could linger in localStorage. This is now addressed by the saveState/resetState cleanup.

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

The only external links in `src/` are on the Contact page (`src/app/contact/page.tsx`), which links to the GitHub repository for bug reports, feature requests, privacy questions, and copyright/takedown inquiries. Every external anchor is paired with `target="_blank"` and `rel="noopener noreferrer"` to prevent tab-nabbing and Referrer leakage. The footer and header link only to internal routes. The About page mentions "Wikimedia Commons and NASA" in prose but does not link to them. If per-image source URLs are later added (e.g. surfaced from H-1 attribution metadata), they must follow the same `target="_blank"` + `rel="noopener noreferrer"` pattern.

---

## Copyright, Privacy, Contact Pages

| Page | Status |
|------|--------|
| `/about` | Exists — documents static/no-login model, IP-safe strategy, content sources |
| `/privacy` | **Exists** (M-1 resolved 2026-07-30) — no-account/no-tracking disclosure, localStorage contents, retention windows, export & reset |
| `/contact` | **Exists** (M-1 resolved 2026-07-30) — GitHub Issues for bugs/features/privacy + copyright/takedown inquiries |
| `/terms` | Not required for a no-account static game, optional |

The About page's "Content sources" and "IP-safe strategy" sections are well-intentioned, and their claims ("Screenshot mode uses public-domain images (such as from Wikimedia Commons and NASA)… Each image carries attribution metadata where its license requires it") are now **true** — both screenshot assets are verified public-domain NASA images with per-file attribution (H-1 resolved 2026-07-26).

---

## Recommended Action Priority

1. **H-1** (fabricated attribution) — **resolved (2026-07-26)**: placeholder `.webp` files replaced with verified public-domain NASA images from Wikimedia Commons; per-file attribution set to real license metadata.
2. **M-1** (Privacy + Contact pages) — **resolved (2026-07-30)**: `/privacy` and `/contact` routes shipped, linked from the footer, and added to the sitemap; takedown path now available for rights holders.
3. **M-3** (CSP + X-Frame-Options/frame-ancestors) — **resolved (Phase 4m, 2026-07-16)**: strict CSP + `X-Frame-Options: DENY` shipped in `public/_headers`; CSP tightening audited 2026-07-26 and confirmed as strict as practical for Next.js static export.
4. **M-2** (answer-exposure honesty note) — **resolved (2026-07-26)**: honor-system paragraph added to the About page.
5. **L-1** (share route validation) — **resolved (2026-07-27)**: `RESULT_ID_REGEX` validation + 12 unit tests.
6. **L-2** (CI dependency scan) — **resolved (2026-07-27)**: two-tier audit (blocking on critical, advisory on high) + next 15.5.22 security patch.
7. **L-3** (JSON-LD price type) — **resolved (Phase 4m, 2026-07-16)**: `price: 0` (number).
8. **L-4** (corrupted-state cleanup) — **resolved (Phase 4m, 2026-07-16)**: `saveState`/`resetState` clear `:corrupted` key.

All security findings are now resolved. The review is fully green as of 2026-07-30.
