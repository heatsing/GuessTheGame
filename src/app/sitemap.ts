import type { MetadataRoute } from "next";

import { canonicalUrl } from "@/lib/site-config";

/**
 * Required by `output: 'export'` (next.config.mjs) so the generated
 * `/sitemap.xml` route is treated as fully static and emitted into `out/`.
 */
export const dynamic = "force-static";

/**
 * Static sitemap for Guess the Game.
 *
 * Lists every indexable static route. `noindex` pages (stats, share/[result-id],
 * archive/[date]) are intentionally excluded — they are thin or duplicate
 * content with no independent indexing value.
 *
 * `lastModified` uses a fixed content date rather than build-time `new Date()`
 * (review P2-37): a static-export site rebuilt for a code-only change should
 * not advertise every page as freshly modified — that dilutes the crawl signal.
 * Bump `SITE_LAST_MODIFIED` when indexable page content actually changes.
 *
 * Generated at build time as `sitemap.xml` in the static export (`out/`).
 */

/** Last date indexable page content meaningfully changed. Bump on real edits. */
const SITE_LAST_MODIFIED = new Date("2026-07-16T00:00:00Z");

export default function sitemap(): MetadataRoute.Sitemap {
  const entries: Array<{
    path: string;
    lastModified: Date;
    changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"];
    priority: number;
  }> = [
    {
      path: "/",
      lastModified: SITE_LAST_MODIFIED,
      changeFrequency: "daily",
      priority: 1.0,
    },
    {
      path: "/daily",
      lastModified: SITE_LAST_MODIFIED,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      path: "/play/keywords",
      lastModified: SITE_LAST_MODIFIED,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      path: "/play/emoji",
      lastModified: SITE_LAST_MODIFIED,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      path: "/play/screenshot",
      lastModified: SITE_LAST_MODIFIED,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      path: "/play/timeline",
      lastModified: SITE_LAST_MODIFIED,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      path: "/how-to-play",
      lastModified: SITE_LAST_MODIFIED,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      path: "/categories",
      lastModified: SITE_LAST_MODIFIED,
      changeFrequency: "weekly",
      priority: 0.6,
    },
    {
      path: "/archive",
      lastModified: SITE_LAST_MODIFIED,
      changeFrequency: "daily",
      priority: 0.6,
    },
    {
      path: "/about",
      lastModified: SITE_LAST_MODIFIED,
      changeFrequency: "monthly",
      priority: 0.4,
    },
  ];

  return entries.map((entry) => ({
    url: canonicalUrl(entry.path),
    lastModified: entry.lastModified,
    changeFrequency: entry.changeFrequency,
    priority: entry.priority,
  }));
}
