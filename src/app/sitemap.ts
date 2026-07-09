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
 * Generated at build time as `sitemap.xml` in the static export (`out/`).
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const entries: Array<{
    path: string;
    lastModified: Date;
    changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"];
    priority: number;
  }> = [
    {
      path: "/",
      lastModified: now,
      changeFrequency: "daily",
      priority: 1.0,
    },
    {
      path: "/play/keywords",
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      path: "/play/emoji",
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      path: "/play/screenshot",
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      path: "/play/timeline",
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      path: "/how-to-play",
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      path: "/categories",
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.6,
    },
    {
      path: "/archive",
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.6,
    },
    {
      path: "/about",
      lastModified: now,
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
