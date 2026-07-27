"use client";

import { useMemo, useState } from "react";

import type { TimelinePuzzle } from "@/lib/content/schemas";
import { scoreTimeline, timelinePositionErrors } from "@/lib/game/scoring";
import { recordModeResult } from "@/storage/actions";
import { useToast } from "@/components/ui/Toast";
import { ResultAnnouncer, type GameResult } from "./ResultAnnouncer";
import { ShareButton } from "./ShareButton";
import { TimelineControls, type TimelineItem } from "./TimelineControls";

export interface TimelineGameProps {
  puzzle: TimelinePuzzle;
  /** UTC date for progress recording (YYYY-MM-DD). */
  utcDate: string;
}

type Phase = "playing" | "solved" | "given_up";

/** Max hints per PRD §5.5 ("Available up to 2 times"). */
const MAX_HINTS = 2;

/**
 * Timeline game board (PRD §5.5).
 *
 * Flow: 4-6 item cards are presented shuffled (NOT chronological). The player
 * rearranges them oldest→newest via `TimelineControls` (move up/down buttons +
 * arrow keys; drag-and-drop may be layered on later). "Submit order" locks the
 * arrangement and scores by total position error (-15 × sum of |Δpos|). "Hint"
 * reveals one item's date (player picks which), -10 each, max 2. Give-up
 * reveals the correct order, score 0.
 *
 * Differences from Keywords/Emoji/Screenshot:
 *  - No text input / guessing — the answer is an ORDER, checked once at submit.
 *  - No "wrong guess" penalty — position errors are scored at submission
 *    (PRD §7.1 row 4).
 *  - Hints reveal a date (item-level), not a category/letter/blur-tier.
 *
 * The correct order is `[...puzzle.items].sort((a,b) => a.date - b.date)` —
 * oldest first. `timelinePositionErrors` computes the sum of absolute position
 * differences between the submitted order and this correct order.
 *
 * Accessibility + storage patterns mirror the other game components. No
 * localStorage calls (guardrail #9) — all persistence via `recordModeResult`.
 */
export function TimelineGame({ puzzle, utcDate }: TimelineGameProps) {
  const toast = useToast();

  // Build the shuffled order ONCE on mount. Use a deterministic shuffle so
  // React StrictMode double-render and SSR/hydration agree. We seed from the
  // puzzle id + utcDate so the same puzzle on the same day is consistently
  // shuffled (avoids a flash of a different order on hydration).
  const [shuffledOrder] = useState<string[]>(() => deterministicShuffle(puzzle));

  // `order` is the player's current arrangement of item ids. Starts shuffled.
  const [order, setOrder] = useState<string[]>(shuffledOrder);
  const [revealedDateIds, setRevealedDateIds] = useState<Set<string>>(new Set());
  const [phase, setPhase] = useState<Phase>("playing");
  const [result, setResult] = useState<GameResult>({ status: "idle" });

  // The correct order: items sorted by date ascending (oldest first).
  const correctOrder = useMemo(
    () => [...puzzle.items].sort((a, b) => a.date - b.date).map((it) => it.title),
    [puzzle.items],
  );

  // Items in the player's current order, mapped to the TimelineControls shape.
  const itemsForControls: TimelineItem[] = useMemo(
    () =>
      order.map((title) => ({
        id: title,
        title,
      })),
    [order],
  );

  const hintsUsed = revealedDateIds.size;
  const allHintsUsed = hintsUsed >= MAX_HINTS;

  const finalScore = useMemo(() => {
    if (phase === "playing") return null;
    const errors = timelinePositionErrors(order, correctOrder);
    return scoreTimeline({
      positionErrors: errors,
      hintsUsed,
      gaveUp: phase === "given_up",
    });
  }, [phase, order, correctOrder, hintsUsed]);

  function handleReorder(next: TimelineItem[]) {
    if (phase !== "playing") return;
    setOrder(next.map((it) => it.id));
  }

  function handleUseHint(itemTitle: string) {
    if (phase !== "playing" || allHintsUsed) return;
    if (revealedDateIds.has(itemTitle)) return; // already revealed
    setRevealedDateIds((prev) => new Set(prev).add(itemTitle));
  }

  function handleSubmit() {
    if (phase !== "playing") return;
    const errors = timelinePositionErrors(order, correctOrder);
    const score = scoreTimeline({ positionErrors: errors, hintsUsed });
    finishGame("solved", score);
  }

  function handleGiveUp() {
    if (phase !== "playing") return;
    finishGame("given_up", 0);
  }

  function finishGame(nextPhase: "solved" | "given_up", score: number) {
    setPhase(nextPhase);
    if (nextPhase === "solved") {
      setResult({ status: "correct", answer: "order submitted" });
    } else {
      setResult({ status: "given_up", answer: "correct order revealed" });
    }

    try {
      const record = recordModeResult(utcDate, "timeline", {
        puzzleId: puzzle.id,
        score,
        revealedClues: hintsUsed, // hints = clues revealed for this mode
        wrongGuesses: [], // Timeline has no wrong-guess concept
        status: nextPhase,
      });
      if (!record.changed) {
        toast.showToast("Result already recorded.", "info");
      }
    } catch {
      toast.showToast("Could not save progress (storage unavailable).", "error");
    }
  }

  // On solve/give-up, show the CORRECT order (oldest→newest with dates).
  const displayOrder: string[] = phase === "playing" ? order : correctOrder;

  return (
    <section aria-labelledby="tl-game-heading" style={sectionStyle}>
      <h2 id="tl-game-heading" className="gtg-sr-only">
        Timeline game
      </h2>

      {/* --- Result announcer --------------------------------------------- */}
      <ResultAnnouncer result={result} />

      {/* --- Hint counter ------------------------------------------------- */}
      <p style={hintCounterStyle} aria-live="polite">
        Hints used: {hintsUsed}/{MAX_HINTS}
      </p>

      {/* --- Item list (controls or revealed) ----------------------------- */}
      {phase === "playing" ? (
        <>
          <TimelineControls
            items={itemsForControls}
            onReorder={handleReorder}
            onSubmit={handleSubmit}
          />
          {/* Hint buttons: reveal one item's date. Disabled if used up. */}
          <div style={hintSectionStyle}>
            <p style={hintInstructionsStyle}>
              Reveal an item&apos;s date for a -10 hint:
            </p>
            <div style={hintButtonsStyle}>
              {puzzle.items.map((item) => {
                const isRevealed = revealedDateIds.has(item.title);
                return (
                  <button
                    key={item.title}
                    type="button"
                    className="gtg-btn gtg-btn-outline gtg-btn-sm"
                    onClick={() => handleUseHint(item.title)}
                    disabled={isRevealed || allHintsUsed}
                  >
                    {item.title}
                    {isRevealed ? `: ${formatDate(item.date)}` : ""}
                  </button>
                );
              })}
            </div>
          </div>
          <button
            type="button"
            className="gtg-btn gtg-btn-ghost gtg-btn-md"
            onClick={handleGiveUp}
            style={{ marginTop: "var(--space-3)" }}
          >
            Give up
          </button>
        </>
      ) : (
        <div style={finishedStyle}>
          <p style={scoreStyle}>
            Final score: <strong>{finalScore}</strong> / 100
          </p>
          <p style={answerRevealStyle}>
            {phase === "solved" ? "Your submitted order:" : "The correct order was:"}
          </p>
          <ol style={revealedListStyle}>
            {displayOrder.map((title, index) => {
              const item = puzzle.items.find((it) => it.title === title);
              return (
                <li key={title} style={revealedItemStyle}>
                  <span style={positionBadgeStyle}>{index + 1}</span>
                  <span style={{ flex: 1 }}>
                    <strong>{title}</strong>
                    <span style={dateStyle}> ({formatDate(item?.date ?? 0)})</span>
                  </span>
                </li>
              );
            })}
          </ol>
          <p style={factStyle}>{puzzle.fact}</p>
          <ShareButton
            text={`Guess the Game — Timeline: I scored ${finalScore}/100. Can you beat me?`}
            url={typeof window !== "undefined" ? window.location.href : undefined}
            title="Guess the Game result"
          />
          <button
            type="button"
            className="gtg-btn gtg-btn-secondary gtg-btn-md"
            onClick={() => window.location.reload()}
            style={{ marginTop: "var(--space-3)" }}
          >
            Play another
          </button>
        </div>
      )}
    </section>
  );
}

// --- Helpers -------------------------------------------------------------

/**
 * Deterministic shuffle of the puzzle item titles. Seeded by the puzzle id +
 * utcDate so the same puzzle on the same day is always shuffled the same way
 * (avoids hydration mismatch + StrictMode double-render drift). Uses a
 * Fisher-Yates shuffle driven by a seeded PRNG (mulberry32).
 *
 * The shuffle guarantees the result is NOT already chronological (re-shuffles
 * until it differs from the correct order), so the player always has a real
 * puzzle to solve.
 */
function deterministicShuffle(puzzle: TimelinePuzzle): string[] {
  const titles = puzzle.items.map((it) => it.title);
  const correct = [...puzzle.items].sort((a, b) => a.date - b.date).map((it) => it.title);

  // Seed from puzzle id + the first item's date for stability.
  const seed = hashString(puzzle.id + titles.join(","));
  let result = [...titles];

  // Try up to 10 times to get a non-chronological shuffle.
  for (let attempt = 0; attempt < 10; attempt++) {
    result = fisherYates([...titles], seed + attempt);
    if (!arraysEqual(result, correct)) {
      return result;
    }
  }
  // Fallback: if somehow always chronological (1-item puzzle, etc.), return as-is.
  return result;
}

function fisherYates<T>(arr: T[], seed: number): T[] {
  const result = [...arr];
  let s = seed >>> 0;
  const rng = () => {
    // mulberry32 PRNG — deterministic, fast, good enough for shuffling.
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j]!, result[i]!];
  }
  return result;
}

function hashString(input: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

function arraysEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((v, i) => v === b[i]);
}

/** Formats a year (number) as a readable string. Negative = BCE. */
function formatDate(year: number): string {
  if (year < 0) return `${Math.abs(year)} BCE`;
  return `${year} CE`;
}

// --- Styles --------------------------------------------------------------

const sectionStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "var(--space-4)",
  maxWidth: "640px",
  margin: "0 auto",
  padding: "var(--space-4)",
};

const hintCounterStyle: React.CSSProperties = {
  color: "var(--color-text-muted)",
  fontSize: "var(--font-size-sm)",
  margin: 0,
};

const hintSectionStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "var(--space-2)",
  padding: "var(--space-3)",
  backgroundColor: "var(--color-surface-elevated)",
  borderRadius: "var(--radius-md)",
  border: "1px solid var(--color-border)",
};

const hintInstructionsStyle: React.CSSProperties = {
  color: "var(--color-text-muted)",
  fontSize: "var(--font-size-sm)",
  margin: 0,
};

const hintButtonsStyle: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: "var(--space-2)",
};

const finishedStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "var(--space-3)",
  padding: "var(--space-4)",
  backgroundColor: "var(--color-surface-elevated)",
  borderRadius: "var(--radius-md)",
  border: "1px solid var(--color-border)",
  textAlign: "center",
};

const scoreStyle: React.CSSProperties = {
  fontSize: "var(--font-size-lg)",
  margin: 0,
};

const answerRevealStyle: React.CSSProperties = {
  margin: 0,
};

const revealedListStyle: React.CSSProperties = {
  listStyle: "none",
  padding: 0,
  margin: "0 auto",
  display: "flex",
  flexDirection: "column",
  gap: "var(--space-2)",
  width: "100%",
  maxWidth: "480px",
  textAlign: "left",
};

const revealedItemStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "var(--space-3)",
  padding: "var(--space-3) var(--space-4)",
  backgroundColor: "var(--color-surface)",
  border: "1px solid var(--color-border)",
  borderRadius: "var(--radius-md)",
};

const positionBadgeStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: "24px",
  height: "24px",
  borderRadius: "var(--radius-full)",
  backgroundColor: "var(--color-primary)",
  color: "var(--color-text-on-primary)",
  fontSize: "var(--font-size-xs)",
  fontWeight: "var(--font-weight-semibold)",
  flexShrink: 0,
};

const dateStyle: React.CSSProperties = {
  color: "var(--color-text-muted)",
  fontSize: "var(--font-size-sm)",
};

const factStyle: React.CSSProperties = {
  margin: 0,
  color: "var(--color-text-muted)",
  fontStyle: "italic",
};
