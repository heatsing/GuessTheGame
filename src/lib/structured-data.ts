/**
 * JSON-LD structured-data objects for Guess the Game.
 *
 * Rendered via `<script type="application/ld+json" dangerouslySetInnerHTML>`
 * in `layout.tsx` and on individual pages. Keeps schema.org payloads in one
 * place so they can be reviewed for correctness and to avoid accidentally
 * emitting disallowed types (no Review / AggregateRating — see SEO task spec).
 */

import { SITE_CONFIG } from "@/lib/site-config";

// Use a loose record type so we can hand-author schema.org JSON without
// fighting TypeScript over optional fields we deliberately omit.
export type JsonLd = Record<string, unknown>;

/** WebSite schema with the site name and root URL. */
export function websiteSchema(): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_CONFIG.name,
    url: SITE_CONFIG.url,
    description: SITE_CONFIG.description,
    inLanguage: SITE_CONFIG.locale,
  };
}

/**
 * WebApplication schema describing the game itself.
 *
 * `offers.price = 0` advertises the game as free. No Review or
 * AggregateRating is emitted — the product has no real rating system and
 * fabricating one would violate the SEO task constraints.
 */
export function webApplicationSchema(): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: SITE_CONFIG.name,
    url: SITE_CONFIG.url,
    description: SITE_CONFIG.description,
    applicationCategory: "Game",
    operatingSystem: "Any",
    inLanguage: SITE_CONFIG.locale,
    offers: {
      "@type": "Offer",
      price: 0,
      priceCurrency: "USD",
    },
  };
}

export interface FaqEntry {
  question: string;
  answer: string;
}

/**
 * FAQPage schema. The `faqs` passed in MUST match the visible FAQ text on the
 * page exactly — this function does no normalization, it only wraps the data.
 */
export function faqPageSchema(faqs: readonly FaqEntry[]): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };
}

/**
 * Escapes characters that would break out of an inline
 * `<script type="application/ld+json">` tag or that are not valid inside
 * JavaScript string literals (and therefore inside JSON embedded in HTML).
 *
 * - `<` and `>` prevent the HTML parser from interpreting `</script>` or
 *   other tag-like sequences as markup while the script content is being
 *   consumed.
 * - U+2028 (LINE SEPARATOR) and U+2029 (PARAGRAPH SEPARATOR) are valid in
 *   JSON strings but invalid in JavaScript string literals, so they would
 *   break the script content if left unescaped.
 *
 * Note: `&` is intentionally NOT escaped. JSON-LD inside a `<script>` tag is
 * parsed as JSON, not as HTML, so `&` has no special meaning there.
 */
function escapeJsonLd(input: string): string {
  return input
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

/**
 * Serializes one or more JSON-LD objects into the string form expected inside
 * a `<script type="application/ld+json">` tag. Used by the `JsonLdScript`
 * component so callers never touch `dangerouslySetInnerHTML` directly.
 *
 * The `JSON.stringify` output is run through `escapeJsonLd` so the resulting
 * string is safe to embed inline in the document (see `escapeJsonLd` for the
 * exact characters that are escaped).
 */
export function serializeJsonLd(data: JsonLd | JsonLd[]): string {
  return escapeJsonLd(JSON.stringify(Array.isArray(data) ? data : [data]));
}
