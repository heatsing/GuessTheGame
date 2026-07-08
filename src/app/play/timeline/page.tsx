import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Timeline",
  description:
    "Timeline mode — arrange four to six items in chronological order. Unlimited practice, no login.",
};

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
        Timeline
      </h1>
      <p style={{ color: "var(--color-text-muted)" }}>
        Arrange items in chronological order.
      </p>
    </div>
  );
}
