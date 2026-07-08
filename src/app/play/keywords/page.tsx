import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Keywords",
  description:
    "Keywords mode — guess the hidden target from progressively revealed keyword clues. Unlimited practice, no login.",
};

export default function KeywordsPage() {
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
        Keywords
      </h1>
      <p style={{ color: "var(--color-text-muted)" }}>
        Guess the word from keyword clues.
      </p>
    </div>
  );
}
