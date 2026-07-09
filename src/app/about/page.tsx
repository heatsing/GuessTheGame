import type { Metadata } from "next";
import Link from "next/link";

import { PAGE_METADATA } from "@/lib/site-config";
import { buildPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = buildPageMetadata({
  title: PAGE_METADATA.about.title,
  description: PAGE_METADATA.about.description,
  path: PAGE_METADATA.about.path,
});

export default function AboutPage() {
  return (
    <div
      style={{
        maxWidth: "820px",
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
        About
      </h1>

      <section style={{ marginBottom: "var(--space-8)" }}>
        <h2
          style={{
            fontSize: "var(--font-size-lg)",
            marginBottom: "var(--space-2)",
          }}
        >
          The project
        </h2>
        <p
          style={{
            color: "var(--color-text-muted)",
            lineHeight: "var(--line-height-relaxed)",
            marginBottom: "var(--space-3)",
          }}
        >
          Guess the Game is a free daily puzzle game that ships five guessing
          mechanics in one place: a Daily Mixed Challenge that combines all
          four modes, plus unlimited practice in Keywords, Emoji,
          Screenshot, and Timeline.
        </p>
        <p
          style={{
            color: "var(--color-text-muted)",
            lineHeight: "var(--line-height-relaxed)",
          }}
        >
          It runs entirely as a static site — no database, no accounts, no
          runtime backend. Puzzle data is bundled at build time as JSON, and
          your streak, scores, and history live only in your browser via
          localStorage.
        </p>
      </section>

      <section style={{ marginBottom: "var(--space-8)" }}>
        <h2
          style={{
            fontSize: "var(--font-size-lg)",
            marginBottom: "var(--space-2)",
          }}
        >
          Content sources
        </h2>
        <p
          style={{
            color: "var(--color-text-muted)",
            lineHeight: "var(--line-height-relaxed)",
          }}
        >
          Topics span geography, science, history, nature, and everyday
          objects — chosen for broad public knowledge. Screenshot mode will
          use public-domain images (such as from Wikimedia Commons and NASA),
          original illustrations, and generated silhouettes. During
          development, screenshot fixtures carry a `placeholder` license label
          and a generated placeholder image; each image will carry attribution
          metadata where its license requires it before the mode ships.
        </p>
      </section>

      <section>
        <h2
          style={{
            fontSize: "var(--font-size-lg)",
            marginBottom: "var(--space-2)",
          }}
        >
          IP-safe strategy
        </h2>
        <p
          style={{
            color: "var(--color-text-muted)",
            lineHeight: "var(--line-height-relaxed)",
          }}
        >
          The product contains no copyrighted screenshots, trademarked logos,
          character art, or box art. All visual assets are either
          public-domain, originally authored, or generated silhouettes. This
          keeps the project legally distributable as a static, open build
          without relying on any third-party copyrighted material.
        </p>
      </section>

      <section>
        <h2
          style={{
            fontSize: "var(--font-size-lg)",
            marginBottom: "var(--space-2)",
          }}
        >
          Get started
        </h2>
        <p
          style={{
            color: "var(--color-text-muted)",
            lineHeight: "var(--line-height-relaxed)",
            marginBottom: "var(--space-3)",
          }}
        >
          Ready to play? Read the{" "}
          <Link href="/how-to-play">full rules for every mode</Link>, jump to a{" "}
          <Link href="/play/keywords">practice round</Link>, or{" "}
          <Link href="/categories">browse puzzles by category</Link>.
        </p>
      </section>
    </div>
  );
}
