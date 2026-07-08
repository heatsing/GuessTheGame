import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Archive",
  description:
    "Browse and replay past Daily Mixed Challenges by date. Archive replays are practice and do not affect your streak.",
};

export default function ArchivePage() {
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
        Archive
      </h1>
      <p style={{ color: "var(--color-text-muted)" }}>
        Browse past daily challenges.
      </p>
    </div>
  );
}
