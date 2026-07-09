import type { Metadata } from "next";

import { PAGE_METADATA } from "@/lib/site-config";
import { buildPageMetadata } from "@/lib/metadata";
import { JsonLdScript } from "@/components/seo/JsonLdScript";
import { faqPageSchema, type FaqEntry } from "@/lib/structured-data";

export const metadata: Metadata = buildPageMetadata({
  title: PAGE_METADATA.howToPlay.title,
  description: PAGE_METADATA.howToPlay.description,
  path: PAGE_METADATA.howToPlay.path,
});

interface ModeRule {
  name: string;
  summary: string;
  details: string[];
}

const modeRules: ModeRule[] = [
  {
    name: "Daily Mixed Challenge",
    summary:
      "Complete four puzzles — one from each mode — and maximize your total score. The set resets at UTC midnight and is the same for every player on a given day. Your streak multiplier applies to the daily total.",
    details: [
      "The daily set contains exactly one Keywords, one Emoji, one Screenshot, and one Timeline puzzle.",
      "You can complete the four puzzles in any order and pause at any time — progress is saved in your browser.",
      "Finishing all four extends your streak; skipping a day breaks it.",
    ],
  },
  {
    name: "Keywords",
    summary:
      "Guess the hidden target from up to six keyword clues, revealed one at a time from vague to specific. Type a guess any time, or reveal the next keyword. Each reveal and wrong guess lowers your score.",
    details: [
      "Six clues are available, ordered from vague to specific.",
      "Type a guess whenever you are ready — correct guesses end the round.",
      "Each revealed clue and each wrong guess reduces your score for the round.",
    ],
  },
  {
    name: "Emoji",
    summary:
      "Guess the target from an emoji sequence shown all at once. Two hints are available — the category, then the first letter. Wrong guesses and hints lower your score.",
    details: [
      "The full emoji sequence is visible from the start.",
      "Hint 1 reveals the category; hint 2 reveals the first letter of the answer.",
      "Wrong guesses and used hints both lower your score.",
    ],
  },
  {
    name: "Screenshot",
    summary:
      "Identify the subject of an image that starts heavily blurred. Sharpen up to three times to bring it into focus. Wrong guesses and sharpen actions lower your score.",
    details: [
      "The image starts heavily blurred; you can sharpen up to three times.",
      "Type a guess at any blur level.",
      "Wrong guesses and each sharpen action reduce your score.",
    ],
  },
  {
    name: "Timeline",
    summary:
      "Arrange four to six items in chronological order, oldest to newest. Drag to reorder or use move up/down buttons. Submit to score based on position errors; hints reveal an item's date.",
    details: [
      "Arrange four to six items oldest-to-newest.",
      "Drag to reorder, or use the move up/down buttons.",
      "Submit to score based on how many items are in the correct position.",
    ],
  },
];

const faqs: readonly FaqEntry[] = [
  {
    question: "Do I need to create an account to play?",
    answer:
      "No. Guess the Game has no login and no accounts. Your streak, scores, and history are stored only in your browser via localStorage.",
  },
  {
    question: "Where is my progress saved?",
    answer:
      "Progress is saved exclusively in your browser's localStorage. Clearing your browser data will reset your streak and stats. We do not run a server or database.",
  },
  {
    question: "When does the Daily Mixed Challenge refresh?",
    answer:
      "The daily set resets at UTC midnight. Each UTC day produces the same set of four puzzles for every player.",
  },
  {
    question: "Can I replay past daily challenges?",
    answer:
      "Yes. The Archive page lists past Daily Mixed Challenges and lets you replay them for practice. Archive replays do not affect your streak.",
  },
  {
    question: "Can I play a single mode without the daily set?",
    answer:
      "Yes. Each mode — Keywords, Emoji, Screenshot, and Timeline — has its own page with unlimited practice rounds that do not affect your daily streak.",
  },
  {
    question: "Is the game free?",
    answer:
      "Yes. Guess the Game is entirely free, with no ads and no in-app purchases.",
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
          marginBottom: "var(--space-4)",
        }}
      >
        How to Play
      </h1>
      <p
        style={{
          color: "var(--color-text-muted)",
          lineHeight: "var(--line-height-relaxed)",
          marginBottom: "var(--space-8)",
          maxWidth: "70ch",
        }}
      >
        Guess the Game combines five guessing mechanics into one quick daily
        session. Each round takes two to three minutes. There is no login and no
        advertising — your streak and scores live only in your browser.
      </p>

      <ol
        style={{
          listStyle: "none",
          display: "flex",
          flexDirection: "column",
          gap: "var(--space-6)",
          padding: 0,
          margin: 0,
          marginBottom: "var(--space-10)",
        }}
      >
        {modeRules.map((rule, index) => {
          return (
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
                  marginBottom: "var(--space-3)",
                }}
              >
                {rule.summary}
              </p>
              <h3
                style={{
                  fontSize: "var(--font-size-sm)",
                  color: "var(--color-text)",
                  marginBottom: "var(--space-2)",
                  marginTop: "var(--space-3)",
                }}
              >
                Details
              </h3>
              <ul
                style={{
                  color: "var(--color-text-muted)",
                  fontSize: "var(--font-size-sm)",
                  lineHeight: "var(--line-height-relaxed)",
                  paddingLeft: "var(--space-5)",
                  margin: 0,
                }}
              >
                {rule.details.map((detail, i) => (
                  <li key={i} style={{ marginBottom: "var(--space-1)" }}>
                    {detail}
                  </li>
                ))}
              </ul>
            </li>
          );
        })}
      </ol>

      <section style={{ marginBottom: "var(--space-10)" }}>
        <h2
          style={{
            fontSize: "var(--font-size-xl)",
            marginBottom: "var(--space-3)",
          }}
        >
          Scoring
        </h2>
        <p
          style={{
            color: "var(--color-text-muted)",
            lineHeight: "var(--line-height-relaxed)",
            marginBottom: "var(--space-3)",
            maxWidth: "70ch",
          }}
        >
          Each puzzle starts at a maximum score. Revealing clues, using hints,
          sharpening images, and making wrong guesses all lower that puzzle&apos;s
          score. The Daily Mixed Challenge totals the four puzzle scores and
          applies your streak multiplier — longer streaks mean a higher daily
          total.
        </p>
        <p
          style={{
            color: "var(--color-text-muted)",
            lineHeight: "var(--line-height-relaxed)",
            maxWidth: "70ch",
          }}
        >
          Practice rounds on individual mode pages are scored the same way but do
          not affect your streak or daily total.
        </p>
      </section>

      <section style={{ marginBottom: "var(--space-10)" }}>
        <h2
          style={{
            fontSize: "var(--font-size-xl)",
            marginBottom: "var(--space-3)",
          }}
        >
          Streaks
        </h2>
        <p
          style={{
            color: "var(--color-text-muted)",
            lineHeight: "var(--line-height-relaxed)",
            maxWidth: "70ch",
          }}
        >
          Complete all four puzzles in a Daily Mixed Challenge to extend your
          streak by one day. Missing a UTC day breaks the streak. Archive replays
          and individual-mode practice rounds do not affect your streak.
        </p>
      </section>

      <section aria-label="Frequently asked questions">
        <h2
          style={{
            fontSize: "var(--font-size-xl)",
            marginBottom: "var(--space-4)",
          }}
        >
          Frequently asked questions
        </h2>
        <dl
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "var(--space-4)",
          }}
        >
          {faqs.map((faq) => (
            <div key={faq.question} className="gtg-card">
              <dt
                style={{
                  fontSize: "var(--font-size-base)",
                  fontWeight: "var(--font-weight-semibold)",
                  marginBottom: "var(--space-2)",
                }}
              >
                {faq.question}
              </dt>
              <dd
                style={{
                  color: "var(--color-text-muted)",
                  fontSize: "var(--font-size-sm)",
                  lineHeight: "var(--line-height-relaxed)",
                  margin: 0,
                }}
              >
                {faq.answer}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <JsonLdScript id="ld-faq" data={faqPageSchema(faqs)} />
    </div>
  );
}
