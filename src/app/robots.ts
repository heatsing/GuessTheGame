import type { MetadataRoute } from "next";

import { SITE_CONFIG, absoluteUrl } from "@/lib/site-config";

/**
 * Required by `output: 'export'` (next.config.mjs) so the generated
 * `/robots.txt` route is treated as fully static and emitted into `out/`.
 */
export const dynamic = "force-static";

/**
 * robots.txt for Guess the Game.
 *
 * Allows all crawlers access to indexable content, disallows thin / duplicate
 * / local-data-dependent paths (stats, shared results, archive date replays),
 * and points to the sitemap. Generated at build time as `robots.txt` in the
 * static export (`out/`).
 *
 * Trailing slashes are included on every disallowed path because
 * `trailingSlash: true` in next.config.mjs means the canonical form of every
 * route ends with `/`.
 *
 * Pattern notes:
 *   - `/stats/` and `/share/` block those subtrees entirely (no index page
 *     exists for either; only dynamic child routes do).
 *   - The archive wildcard pattern blocks date-stamped replay pages such as
 *     `/archive/2026-01-01/` while leaving the `/archive/` index crawlable.
 *     The `*` matches one or more chars because the pattern requires a
 *     trailing slash after it.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/stats/", "/share/", "/archive/*/"],
      },
    ],
    sitemap: absoluteUrl("sitemap.xml"),
    host: SITE_CONFIG.url,
  };
}
