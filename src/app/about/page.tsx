import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About",
  description:
    "About Guess the Game — a static, no-login daily puzzle game built with IP-safe, public-domain content.",
};

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
          objects — chosen for broad public knowledge. Screenshot mode uses
          public-domain images (such as from Wikimedia Commons and NASA),
          original illustrations, and generated silhouettes. Each image
          carries attribution metadata where its license requires it.
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
    </div>
  );
}
