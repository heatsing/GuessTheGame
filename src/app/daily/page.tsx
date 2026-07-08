import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Daily Challenge",
  description:
    "Today's Daily Mixed Challenge — four puzzles across Keywords, Emoji, Screenshot, and Timeline. Resets at UTC midnight.",
};

const puzzleModes = [
  { id: "keywords", name: "Keywords" },
  { id: "emoji", name: "Emoji" },
  { id: "screenshot", name: "Screenshot" },
  { id: "timeline", name: "Timeline" },
];

export default function DailyPage() {
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
        Daily Challenge
      </h1>
      <p
        style={{
          color: "var(--color-text-muted)",
          marginBottom: "var(--space-6)",
        }}
      >
        Today&apos;s challenge will appear here.
      </p>

      <section aria-label="Today's puzzles">
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "var(--space-4)",
          }}
        >
          {puzzleModes.map((mode) => (
            <div key={mode.id} className="gtg-card">
              <h2
                style={{
                  fontSize: "var(--font-size-lg)",
                  marginBottom: "var(--space-2)",
                }}
              >
                {mode.name}
              </h2>
              <p
                style={{
                  color: "var(--color-text-muted)",
                  fontSize: "var(--font-size-sm)",
                }}
              >
                Puzzle placeholder — not yet implemented.
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
