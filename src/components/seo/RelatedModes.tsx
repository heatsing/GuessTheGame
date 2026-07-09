import Link from "next/link";

import { otherModes, type ModeInfo } from "@/lib/site-config";

interface RelatedModesProps {
  currentSlug: ModeInfo["slug"];
}

/**
 * "Related modes" link block rendered at the bottom of each `/play/[mode]`
 * page. Links to the three other play modes plus How to Play and Archive,
 * giving crawlers and players a clear path through the play surface.
 */
export function RelatedModes({ currentSlug }: RelatedModesProps) {
  const related = otherModes(currentSlug);

  const extraLinks = [
    { href: "/how-to-play", name: "How to Play", description: "Full rules and scoring for every mode." },
    { href: "/archive", name: "Archive", description: "Replay past Daily Mixed Challenges." },
  ];

  return (
    <section
      aria-label="Related modes"
      style={{ marginTop: "var(--space-10)" }}
    >
      <h2
        style={{
          fontSize: "var(--font-size-lg)",
          marginBottom: "var(--space-4)",
        }}
      >
        Related modes
      </h2>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "var(--space-4)",
        }}
      >
        {related.map((mode) => (
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
        {extraLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
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
              {link.name}
            </h3>
            <p
              style={{
                color: "var(--color-text-muted)",
                fontSize: "var(--font-size-sm)",
              }}
            >
              {link.description}
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}
