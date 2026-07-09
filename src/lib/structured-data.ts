/**
 * JSON-LD structured-data objects for Guess the Game.
 *
 * Rendered via `<script type="application/ld+json" dangerouslySetInnerHTML>`
 * in `layout.tsx` and on individual pages. Keeps schema.org payloads in one
 * place so they can be reviewed for correctness and to avoid accidentally
 * emitting disallowed types (no Review / AggregateRating — see SEO task spec).
 */

import { SITE_CONFIG, canonicalUrl } from "@/lib/site-config";

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
 * `offers.price = "0"` advertises the game as free. No Review or
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
      price: "0",
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
 * BreadcrumbList schema for navigation breadcrumbs. Used on inner pages to
 * help crawkers understand site hierarchy.
 */
export function breadcrumbSchema(
  items: ReadonlyArray<{ name: string; path: string }>,
): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: canonicalUrl(item.path),
    })),
  };
}

/**
 * Serializes one or more JSON-LD objects into the string form expected inside
 * a `<script type="application/ld+json">` tag. Used by the `JsonLdScript`
 * component so callers never touch `dangerouslySetInnerHTML` directly.
 */
export function serializeJsonLd(data: JsonLd | JsonLd[]): string {
  return JSON.stringify(Array.isArray(data) ? data : [data]);
}
