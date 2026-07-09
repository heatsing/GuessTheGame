import Link from "next/link";
import type { Metadata } from "next";

import { PAGE_METADATA, MODES, DOMAINS } from "@/lib/site-config";
import { buildPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = buildPageMetadata({
  title: PAGE_METADATA.categories.title,
  description: PAGE_METADATA.categories.description,
  path: PAGE_METADATA.categories.path,
});

export default function CategoriesPage() {
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
        Categories
      </h1>
      <p
        style={{
          color: "var(--color-text-muted)",
          lineHeight: "var(--line-height-relaxed)",
          marginBottom: "var(--space-8)",
          maxWidth: "70ch",
        }}
      >
        Browse Guess the Game puzzles by topic or by play mode. Every mode draws
        from the same five domains — pick a domain to focus your practice, or a
        mode to change the way you guess.
      </p>

      <section aria-label="Browse by domain" style={{ marginBottom: "var(--space-10)" }}>
        <h2
          style={{
            fontSize: "var(--font-size-xl)",
            marginBottom: "var(--space-4)",
          }}
        >
          Browse by domain
        </h2>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "var(--space-4)",
          }}
        >
          {DOMAINS.map((domain) => (
            <div key={domain.slug} className="gtg-card">
              <h3
                style={{
                  fontSize: "var(--font-size-lg)",
                  marginBottom: "var(--space-2)",
                }}
              >
                {domain.name}
              </h3>
              <p
                style={{
                  color: "var(--color-text-muted)",
                  fontSize: "var(--font-size-sm)",
                  lineHeight: "var(--line-height-relaxed)",
                  marginBottom: "var(--space-3)",
                }}
              >
                {domain.description}
              </p>
              <p style={{ fontSize: "var(--font-size-sm)" }}>
                Play in{" "}
                {MODES.map((mode, i) => (
                  <span key={mode.slug}>
                    <Link href={mode.href}>{mode.name}</Link>
                    {i < MODES.length - 1 ? ", " : ""}
                  </span>
                ))}
                .
              </p>
            </div>
          ))}
        </div>
      </section>

      <section aria-label="Browse by mode" style={{ marginBottom: "var(--space-10)" }}>
        <h2
          style={{
            fontSize: "var(--font-size-xl)",
            marginBottom: "var(--space-4)",
          }}
        >
          Browse by mode
        </h2>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "var(--space-4)",
          }}
        >
          {MODES.map((mode) => (
            <Link
              key={mode.slug}
              href={mode.href}
              className="gtg-card gtg-card-interactive"
              style={{
                display: "block",
                textDecoration: "none",
                color: "var(--color-text)",
              }}
            >
              <h3
                style={{
                  fontSize: "var(--font-size-lg)",
                  marginBottom: "var(--space-2)",
                }}
              >
                {mode.name}
              </h3>
              <p
                style={{
                  color: "var(--color-text-muted)",
                  fontSize: "var(--font-size-sm)",
                }}
              >
                {mode.howTo}
              </p>
            </Link>
          ))}
        </div>
      </section>

      <section aria-label="More to explore">
        <h2
          style={{
            fontSize: "var(--font-size-xl)",
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
          Read the <Link href="/how-to-play">full rules for every mode</Link>,
          replay a <Link href="/archive">past Daily Mixed Challenge</Link>, or
          learn <Link href="/about">about the project</Link>.
        </p>
      </section>
    </div>
  );
}
