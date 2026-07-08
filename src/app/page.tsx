import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { absolute: "Guess the Game — Daily puzzle challenges" },
  description:
    "Play five guessing game modes — Daily Mixed Challenge, Keywords, Emoji, Screenshot, and Timeline. No login, no ads, finishes in under three minutes.",
};

const quickModes = [
  {
    href: "/play/keywords",
    name: "Keywords",
    description: "Guess the word from keyword clues.",
  },
  {
    href: "/play/emoji",
    name: "Emoji",
    description: "Guess from an emoji sequence.",
  },
  {
    href: "/play/screenshot",
    name: "Screenshot",
    description: "Identify the sharpened image.",
  },
  {
    href: "/play/timeline",
    name: "Timeline",
    description: "Arrange items chronologically.",
  },
];

export default function HomePage() {
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
        Guess the Game
      </h1>

      <section
        aria-label="Today's Daily Challenge"
        style={{ marginBottom: "var(--space-10)" }}
      >
        <div className="gtg-card">
          <p
            style={{
              color: "var(--color-text-muted)",
              fontSize: "var(--font-size-sm)",
              marginBottom: "var(--space-2)",
            }}
          >
            Today&apos;s Daily Challenge
          </p>
          <h2
            style={{
              fontSize: "var(--font-size-xl)",
              marginBottom: "var(--space-3)",
            }}
          >
            Daily Mixed Challenge
          </h2>
          <p
            style={{
              color: "var(--color-text-muted)",
              marginBottom: "var(--space-5)",
            }}
          >
            4 puzzles · 2-3 min · resets at UTC midnight
          </p>
          <Link
            href="/daily"
            className="gtg-btn gtg-btn-primary gtg-btn-md"
            style={{ textDecoration: "none" }}
          >
            Start
          </Link>
        </div>
      </section>

      <section
        aria-label="Quick play modes"
        style={{ marginBottom: "var(--space-10)" }}
      >
        <h2
          style={{
            fontSize: "var(--font-size-lg)",
            marginBottom: "var(--space-4)",
          }}
        >
          Quick play
        </h2>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "var(--space-4)",
          }}
        >
          {quickModes.map((mode) => (
            <Link
              key={mode.href}
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
                {mode.description}
              </p>
            </Link>
          ))}
        </div>
      </section>

      <section aria-label="About Guess the Game">
        <details>
          <summary
            style={{
              cursor: "pointer",
              color: "var(--color-text-muted)",
              fontSize: "var(--font-size-sm)",
              display: "inline-block",
            }}
          >
            About Guess the Game
          </summary>
          <div
            style={{
              marginTop: "var(--space-3)",
              color: "var(--color-text-muted)",
              fontSize: "var(--font-size-sm)",
              lineHeight: "var(--line-height-relaxed)",
              maxWidth: "70ch",
            }}
          >
            <p style={{ marginBottom: "var(--space-3)" }}>
              Guess the Game is a free, daily puzzle game that combines five
              guessing mechanics into one quick session. The Daily Mixed
              Challenge draws one puzzle from each mode — Keywords, Emoji,
              Screenshot, and Timeline — for a fresh mix every UTC day.
            </p>
            <p style={{ marginBottom: "var(--space-3)" }}>
              Each round takes two to three minutes. There is no login, no
              account, and no advertising. Your streak, scores, and history
              are stored only in your browser. Come back each day to keep
              your streak alive and beat your best score.
            </p>
            <p>
              Prefer a specific mode? Jump straight into Keywords, Emoji,
              Screenshot, or Timeline from the quick-play tiles above for
              unlimited practice rounds.
            </p>
          </div>
        </details>
      </section>
    </div>
  );
}
