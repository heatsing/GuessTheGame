import type { Metadata } from "next";
import Link from "next/link";

import { PAGE_METADATA } from "@/lib/site-config";
import { buildPageMetadata } from "@/lib/metadata";

/**
 * The stats page depends entirely on the player's local localStorage data —
 * it has no crawlable static content. It is kept out of the sitemap, disallowed
 * in robots.txt, and tagged `noindex` here so crawlers do not index a
 * placeholder shell.
 */
export const metadata: Metadata = buildPageMetadata({
  title: PAGE_METADATA.stats.title,
  description: PAGE_METADATA.stats.description,
  path: PAGE_METADATA.stats.path,
  noindex: true,
});

const summaryStats = [
  { label: "Current streak", value: "—" },
  { label: "Max streak", value: "—" },
  { label: "Best daily score", value: "—" },
];

export default function StatsPage() {
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
          marginBottom: "var(--space-6)",
        }}
      >
        Stats
      </h1>

      <section
        aria-label="Streak and best score"
        style={{ marginBottom: "var(--space-8)" }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
            gap: "var(--space-4)",
          }}
        >
          {summaryStats.map((stat) => (
            <div key={stat.label} className="gtg-card">
              <p
                style={{
                  color: "var(--color-text-muted)",
                  fontSize: "var(--font-size-sm)",
                  marginBottom: "var(--space-2)",
                }}
              >
                {stat.label}
              </p>
              <p
                style={{
                  fontSize: "var(--font-size-2xl)",
                  fontWeight: "var(--font-weight-bold)",
                }}
              >
                {stat.value}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section aria-label="Activity heatmap">
        <h2
          style={{
            fontSize: "var(--font-size-lg)",
            marginBottom: "var(--space-3)",
          }}
        >
          Last 30 days
        </h2>
        <div
          className="gtg-card"
          aria-label="Activity heatmap placeholder"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(10, 1fr)",
            gap: "var(--space-1)",
            minHeight: "120px",
            alignItems: "center",
          }}
        >
          <p
            style={{
              color: "var(--color-text-muted)",
              fontSize: "var(--font-size-sm)",
              gridColumn: "1 / -1",
              textAlign: "center",
            }}
          >
            Heatmap will appear here.
          </p>
        </div>
      </section>

      <section aria-label="Keep playing" style={{ marginTop: "var(--space-8)" }}>
        <p
          style={{
            color: "var(--color-text-muted)",
            fontSize: "var(--font-size-sm)",
          }}
        >
          <Link href="/how-to-play">Learn how the streak works</Link> or{" "}
          <Link href="/play/keywords">jump back into a practice round</Link>.
        </p>
      </section>
    </div>
  );
}
