import type { Metadata } from "next";
import Link from "next/link";

import { PAGE_METADATA } from "@/lib/site-config";
import { buildPageMetadata } from "@/lib/metadata";

/**
 * Shared result pages are thin, dynamic, and have no independent indexing value
 * — each one is a single player's result snapshot. They are kept out of the
 * sitemap, disallowed in robots.txt, and tagged `noindex` here. Basic metadata
 * is still emitted so link previews on social media are not blank.
 */
export const metadata: Metadata = buildPageMetadata({
  title: PAGE_METADATA.share.title,
  description: PAGE_METADATA.share.description,
  path: "/share",
  noindex: true,
});

// Shell placeholder — will be replaced with real result IDs when sharing is implemented.
export function generateStaticParams(): { "result-id": string }[] {
  return [{ "result-id": "placeholder" }];
}

export default async function SharedResultPage({
  params,
}: {
  params: Promise<{ "result-id": string }>;
}) {
  const resolved = await params;
  const resultId = resolved["result-id"];

  return (
    <div
      style={{
        maxWidth: "640px",
        margin: "0 auto",
        padding: "var(--space-6) var(--space-4)",
      }}
    >
      <p
        style={{
          color: "var(--color-text-muted)",
          fontSize: "var(--font-size-sm)",
          marginBottom: "var(--space-2)",
        }}
      >
        {resultId}
      </p>
      <h1
        style={{
          fontSize: "var(--font-size-2xl)",
          marginBottom: "var(--space-3)",
        }}
      >
        Shared Result
      </h1>
      <p
        style={{
          color: "var(--color-text-muted)",
          lineHeight: "var(--line-height-relaxed)",
          marginBottom: "var(--space-6)",
        }}
      >
        View this player&apos;s result, then start your own daily challenge and
        build a streak.
      </p>

      <div
        className="gtg-card"
        style={{ minHeight: "160px", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "var(--space-6)" }}
      >
        <p style={{ color: "var(--color-text-muted)" }}>
          The shared result card will appear here.
        </p>
      </div>

      <p style={{ color: "var(--color-text-muted)", fontSize: "var(--font-size-sm)" }}>
        <Link href="/">Back to home</Link> ·{" "}
        <Link href="/how-to-play">How to play</Link>
      </p>
    </div>
  );
}
