import type { Metadata } from "next";

import { SITE_CONFIG, canonicalUrl, absoluteUrl } from "@/lib/site-config";

export interface BuildMetadataOptions {
  /** Title fragment (will be combined with the `%s | Guess the Game` template). */
  title: string;
  description: string;
  /** Site-relative path (e.g. `/play/keywords`). Trailing slash is normalized. */
  path: string;
  /** OpenGraph type. Defaults to `website`. */
  type?: "website" | "article" | "profile";
  /** When true, emits `robots: { index: false, follow: true }`. */
  noindex?: boolean;
  /** Override the canonical path (e.g. archive/[date] points back to /archive/). */
  canonicalPath?: string;
  /** Optional natural keywords (3–5). Avoid keyword stuffing. */
  keywords?: string[];
}

/**
 * Builds a per-page `Metadata` object with a unique title, description,
 * canonical URL, OpenGraph, and Twitter card. Canonical and OG URLs are
 * produced via `canonicalUrl` so the production domain (`SITE_CONFIG.url`)
 * and `trailingSlash: true` are respected consistently.
 */
export function buildPageMetadata({
  title,
  description,
  path,
  type = "website",
  noindex = false,
  canonicalPath,
  keywords,
}: BuildMetadataOptions): Metadata {
  const canonical = canonicalUrl(canonicalPath ?? path);

  const metadata: Metadata = {
    title,
    description,
    alternates: {
      canonical,
    },
    openGraph: {
      title,
      description,
      url: canonical,
      siteName: SITE_CONFIG.name,
      type,
      images: [
        {
          url: absoluteUrl(SITE_CONFIG.ogImage),
          alt: SITE_CONFIG.name,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      site: SITE_CONFIG.twitterHandle,
      images: [absoluteUrl(SITE_CONFIG.ogImage)],
    },
  };

  if (keywords && keywords.length > 0) {
    metadata.keywords = keywords;
  }

  if (noindex) {
    metadata.robots = {
      index: false,
      follow: true,
    };
  }

  return metadata;
}
