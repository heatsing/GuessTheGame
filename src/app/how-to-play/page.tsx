import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "How to Play",
  description:
    "Rules for all five Guess the Game modes — Daily Mixed Challenge, Keywords, Emoji, Screenshot, and Timeline.",
};

const rules = [
  {
    name: "Daily Mixed Challenge",
    summary:
      "Complete four puzzles — one from each mode — and maximize your total score. The set resets at UTC midnight and is the same for every player on a given day. Your streak multiplier applies to the daily total.",
  },
  {
    name: "Keywords",
    summary:
      "Guess the hidden target from up to six keyword clues, revealed one at a time from vague to specific. Type a guess any time, or reveal the next keyword. Each reveal and wrong guess lowers your score.",
  },
  {
    name: "Emoji",
    summary:
      "Guess the target from an emoji sequence shown all at once. Two hints are available — the category, then the first letter. Wrong guesses and hints lower your score.",
  },
  {
    name: "Screenshot",
    summary:
      "Identify the subject of an image that starts heavily blurred. Sharpen up to three times to bring it into focus. Wrong guesses and sharpen actions lower your score.",
  },
  {
    name: "Timeline",
    summary:
      "Arrange four to six items in chronological order, oldest to newest. Drag to reorder or use move up/down buttons. Submit to score based on position errors; hints reveal an item's date.",
  },
];

export default function HowToPlayPage() {
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
        How to Play
      </h1>
      <ol
        style={{
          listStyle: "none",
          display: "flex",
          flexDirection: "column",
          gap: "var(--space-4)",
          padding: 0,
          margin: 0,
        }}
      >
        {rules.map((rule, index) => (
          <li key={rule.name} className="gtg-card">
            <h2
              style={{
                fontSize: "var(--font-size-lg)",
                marginBottom: "var(--space-2)",
              }}
            >
              {index + 1}. {rule.name}
            </h2>
            <p
              style={{
                color: "var(--color-text-muted)",
                fontSize: "var(--font-size-sm)",
                lineHeight: "var(--line-height-relaxed)",
              }}
            >
              {rule.summary}
            </p>
          </li>
        ))}
      </ol>
    </div>
  );
}
