import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Emoji",
  description:
    "Emoji mode — guess the hidden target from an emoji sequence. Unlimited practice, no login.",
};

export default function EmojiPage() {
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
        Emoji
      </h1>
      <p style={{ color: "var(--color-text-muted)" }}>
        Guess from the emoji sequence.
      </p>
    </div>
  );
}
