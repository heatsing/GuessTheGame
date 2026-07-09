import type { Metadata } from "next";
import Link from "next/link";

import { PAGE_METADATA } from "@/lib/site-config";
import { buildPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = buildPageMetadata({
  title: PAGE_METADATA.archive.title,
  description: PAGE_METADATA.archive.description,
  path: PAGE_METADATA.archive.path,
});

export default function ArchivePage() {
  return (
    <div
      style={{
        maxWidth: "1024px",
        margin: "0 auto",
        padding: "var(--space-6) var(--space-4)",
      }}
    >
      <h1
        style={{
          fontSize: "var(--font-size-2xl)",
          marginBottom: "var(--space-3)",
        }}
      >
        Archive
      </h1>
      <p
        style={{
          color: "var(--color-text-muted)",
          lineHeight: "var(--line-height-relaxed)",
          marginBottom: "var(--space-6)",
          maxWidth: "70ch",
        }}
      >
        Browse and replay past Daily Mixed Challenges. Each daily set draws one
        puzzle from every mode — Keywords, Emoji, Screenshot, and Timeline — and
        is the same for every player on a given UTC day. Archive replays are
        practice and do not affect your streak.
      </p>

      <section aria-label="Archive entries" style={{ marginBottom: "var(--space-8)" }}>
        <div
          className="gtg-card"
          style={{ minHeight: "160px", display: "flex", alignItems: "center", justifyContent: "center" }}
        >
          <p style={{ color: "var(--color-text-muted)" }}>
            Past challenges will be listed here once the daily schedule is live.
          </p>
        </div>
      </section>

      <section aria-label="More to explore">
        <h2
          style={{
            fontSize: "var(--font-size-lg)",
            marginBottom: "var(--space-3)",
          }}
        >
          More to explore
        </h2>
        <p
          style={{
            color: "var(--color-text-muted)",
            fontSize: "var(--font-size-sm)",
            lineHeight: "var(--line-height-relaxed)",
          }}
        >
          New here? Read the{" "}
          <Link href="/how-to-play">rules for every mode</Link> or{" "}
          <Link href="/categories">browse puzzles by category</Link>. You can
          also jump straight into a{" "}
          <Link href="/play/keywords">practice round</Link>.
        </p>
      </section>
    </div>
  );
}
