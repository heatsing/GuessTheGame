import type { Metadata } from "next";
import Link from "next/link";

import { PAGE_METADATA } from "@/lib/site-config";
import { buildPageMetadata } from "@/lib/metadata";

/**
 * Archive date replays are thin, near-duplicate pages (one per UTC day) with no
 * independent indexing value. They are kept out of the sitemap, disallowed in
 * robots.txt, and tagged `noindex` here. The canonical points back to the
 * `/archive/` index so any link equity consolidates on the browsable archive.
 */
export const metadata: Metadata = buildPageMetadata({
  title: PAGE_METADATA.archiveReplay.title,
  description: PAGE_METADATA.archiveReplay.description,
  path: "/archive",
  noindex: true,
  canonicalPath: PAGE_METADATA.archive.path,
});

// Shell placeholder — will be replaced with real schedule when content is curated.
export function generateStaticParams(): { date: string }[] {
  return [{ date: "2026-01-01" }];
}

export default async function ArchiveReplayPage({
  params,
}: {
  params: Promise<{ date: string }>;
}) {
  const { date } = await params;

  return (
    <div
      style={{
        maxWidth: "1024px",
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
        {date}
      </p>
      <h1
        style={{
          fontSize: "var(--font-size-2xl)",
          marginBottom: "var(--space-3)",
        }}
      >
        Archive Replay
      </h1>
      <p
        style={{
          color: "var(--color-text-muted)",
          lineHeight: "var(--line-height-relaxed)",
          marginBottom: "var(--space-6)",
        }}
      >
        Replay this past challenge. Archive replays are practice and do not
        affect your streak.
      </p>

      <div
        className="gtg-card"
        style={{ minHeight: "200px", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "var(--space-6)" }}
      >
        <p style={{ color: "var(--color-text-muted)" }}>
          The replay board will appear here.
        </p>
      </div>

      <p style={{ color: "var(--color-text-muted)", fontSize: "var(--font-size-sm)" }}>
        <Link href="/archive">Back to archive</Link> ·{" "}
        <Link href="/how-to-play">How to play</Link>
      </p>
    </div>
  );
}
