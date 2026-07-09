import type { Metadata } from "next";

import { getModeInfo } from "@/lib/site-config";
import { buildPageMetadata } from "@/lib/metadata";
import { RelatedModes } from "@/components/seo/RelatedModes";

const info = getModeInfo("timeline");

export const metadata: Metadata = buildPageMetadata({
  title: info.title,
  description: info.description,
  path: info.href,
  keywords: info.keywords,
});

export default function TimelinePage() {
  return (
    <div
      style={{
        maxWidth: "720px",
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
        {info.h1}
      </h1>

      <p
        style={{
          color: "var(--color-text-muted)",
          lineHeight: "var(--line-height-relaxed)",
          marginBottom: "var(--space-6)",
        }}
      >
        {info.intro}
      </p>

      <section
        aria-label="How to play Timeline"
        className="gtg-card"
        style={{ marginBottom: "var(--space-8)" }}
      >
        <h2
          style={{
            fontSize: "var(--font-size-lg)",
            marginBottom: "var(--space-2)",
          }}
        >
          How to play
        </h2>
        <p
          style={{
            color: "var(--color-text-muted)",
            fontSize: "var(--font-size-sm)",
            lineHeight: "var(--line-height-relaxed)",
          }}
        >
          {info.howTo}
        </p>
      </section>

      {/* Game interaction area — placeholder for the playable Timeline game. */}
      <section
        aria-label="Play Timeline"
        className="gtg-card"
        style={{ minHeight: "240px", display: "flex", alignItems: "center", justifyContent: "center" }}
      >
        <p style={{ color: "var(--color-text-muted)" }}>
          The Timeline game board will appear here.
        </p>
      </section>

      <RelatedModes currentSlug={info.slug} />
    </div>
  );
}
