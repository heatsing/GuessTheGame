"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";

import type { EmojiPuzzle } from "@/lib/content/schemas";
import { normalizeAnswer, isCorrectGuess } from "@/lib/game/match";
import { scoreEmoji } from "@/lib/game/scoring";
import { recordModeResult } from "@/storage/actions";
import { useToast } from "@/components/ui/Toast";
import { ResultAnnouncer, type GameResult } from "./ResultAnnouncer";
import { ShareButton } from "./ShareButton";

export interface EmojiGameProps {
  puzzle: EmojiPuzzle;
  /** UTC date for progress recording (YYYY-MM-DD). */
  utcDate: string;
}

type Phase = "playing" | "solved" | "given_up";

/**
 * Emoji game board (PRD §5.3).
 *
 * Flow: 3-6 emoji are shown immediately (they are the puzzle, not a revealable
 * resource — unlike Keywords). The player types a guess. Two optional hints are
 * available: the category (-25) and the first letter (-25). Each wrong guess is
 * -20. The score floors at 10; give-up returns 0 and locks the record.
 *
 * Differences from KeywordsGame:
 *  - Emojis are all shown upfront (they ARE the puzzle); there is no "reveal
 *    next clue" concept.
 *  - Hints are discrete (category / firstLetter), not a count of revealed items.
 *  - Score uses `scoreEmoji` (not `scoreKeywords`).
 *
 * Accessibility + storage patterns mirror KeywordsGame (see that component's
 * docstring). No localStorage calls in this component (guardrail #9) — all
 * persistence goes through `recordModeResult` in `src/storage/actions.ts`.
 */
export function EmojiGame({ puzzle, utcDate }: EmojiGameProps) {
  const toast = useToast();
  const inputId = useId();
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const [guess, setGuess] = useState("");
  const [wrongGuesses, setWrongGuesses] = useState<string[]>([]);
  const [hintsUsed, setHintsUsed] = useState(0); // 0, 1, or 2
  const [phase, setPhase] = useState<Phase>("playing");
  const [result, setResult] = useState<GameResult>({ status: "idle" });

  // Hint 1 = category, Hint 2 = firstLetter. Each costs -25 (PRD §5.3).
  const categoryRevealed = hintsUsed >= 1;
  const firstLetterRevealed = hintsUsed >= 2;
  const allHintsUsed = hintsUsed >= 2;

  const finalScore = useMemo(
    () =>
      scoreEmoji({
        wrongGuesses: wrongGuesses.length,
        hintsUsed,
        gaveUp: phase === "given_up",
      }),
    [wrongGuesses.length, hintsUsed, phase],
  );

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (phase !== "playing") return;
    const trimmed = guess.trim();
    if (trimmed.length === 0) return;

    const normalized = normalizeAnswer(trimmed);
    if (isCorrectGuess(normalized, { target: puzzle.target, aliases: puzzle.aliases })) {
      const score = scoreEmoji({
        wrongGuesses: wrongGuesses.length,
        hintsUsed,
      });
      finishGame("solved", score);
      setGuess("");
      return;
    }

    if (!wrongGuesses.includes(normalized)) {
      setWrongGuesses((prev) => [...prev, normalized]);
    }
    setResult({ status: "wrong", guess: trimmed });
    setGuess("");
    inputRef.current?.focus();
  }

  function handleUseHint() {
    if (phase !== "playing" || allHintsUsed) return;
    setHintsUsed((prev) => Math.min(prev + 1, 2));
  }

  function handleGiveUp() {
    if (phase !== "playing") return;
    finishGame("given_up", 0);
  }

  function finishGame(nextPhase: "solved" | "given_up", score: number) {
    setPhase(nextPhase);
    if (nextPhase === "solved") {
      setResult({ status: "correct", answer: puzzle.target });
    } else {
      setResult({ status: "given_up", answer: puzzle.target });
    }

    try {
      const record = recordModeResult(utcDate, "emoji", {
        puzzleId: puzzle.id,
        score,
        revealedClues: hintsUsed, // hints used = clues revealed for this mode
        wrongGuesses,
        status: nextPhase,
      });
      if (!record.changed) {
        toast.showToast("Result already recorded.", "info");
      }
    } catch {
      toast.showToast("Could not save progress (storage unavailable).", "error");
    }
  }

  return (
    <section
      aria-labelledby="em-game-heading"
      style={sectionStyle}
    >
      <h2 id="em-game-heading" className="gtg-sr-only">
        Emoji game
      </h2>

      {/* --- Emojis (the puzzle itself — all shown upfront) ---------------- */}
      <div aria-label="Emoji puzzle" style={emojiContainerStyle}>
        <span style={emojiStyle}>{puzzle.emojis.join(" ")}</span>
      </div>

      {/* --- Hints -------------------------------------------------------- */}
      <div aria-label="Hints" style={hintsContainerStyle}>
        <div style={hintItemStyle(categoryRevealed)}>
          <span aria-hidden="true" style={hintIconStyle}>
            {categoryRevealed ? "📂" : "🔒"}
          </span>
          {categoryRevealed ? (
            <span>
              Category: <strong>{puzzle.hints.category}</strong>
            </span>
          ) : (
            <span style={hiddenHintStyle}>Category hint hidden</span>
          )}
        </div>
        <div style={hintItemStyle(firstLetterRevealed)}>
          <span aria-hidden="true" style={hintIconStyle}>
            {firstLetterRevealed ? "🔤" : "🔒"}
          </span>
          {firstLetterRevealed ? (
            <span>
              First letter: <strong>{puzzle.hints.firstLetter.toUpperCase()}</strong>
            </span>
          ) : (
            <span style={hiddenHintStyle}>First-letter hint hidden</span>
          )}
        </div>
      </div>

      {/* --- Result announcer --------------------------------------------- */}
      <ResultAnnouncer result={result} />

      {/* --- Wrong-guess history ------------------------------------------ */}
      {wrongGuesses.length > 0 && (
        <div aria-label="Previous wrong guesses" style={wrongListStyle}>
          {wrongGuesses.map((g, i) => (
            <span key={`${g}-${i}`} style={wrongChipStyle}>
              {g}
            </span>
          ))}
        </div>
      )}

      {/* --- Input + actions ---------------------------------------------- */}
      {phase === "playing" ? (
        <form onSubmit={handleSubmit} style={formStyle}>
          <label htmlFor={inputId} className="gtg-sr-only">
            Type your guess
          </label>
          <textarea
            id={inputId}
            ref={inputRef}
            value={guess}
            onChange={(e) => setGuess(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e as unknown as React.FormEvent);
              }
            }}
            placeholder="Type your guess…"
            rows={1}
            style={inputStyle}
            aria-describedby="em-game-instructions"
            disabled={phase !== "playing"}
          />
          <div style={actionRowStyle}>
            <button
              type="submit"
              className="gtg-btn gtg-btn-primary gtg-btn-md"
              disabled={guess.trim().length === 0}
            >
              Submit guess
            </button>
            <button
              type="button"
              className="gtg-btn gtg-btn-outline gtg-btn-md"
              onClick={handleUseHint}
              disabled={allHintsUsed}
            >
              Use hint ({hintsUsed}/2)
            </button>
            <button
              type="button"
              className="gtg-btn gtg-btn-ghost gtg-btn-md"
              onClick={handleGiveUp}
            >
              Give up
            </button>
          </div>
          <p id="em-game-instructions" className="gtg-sr-only">
            Type a guess and press Enter or Submit. Use Hint to reveal the
            category (-25 points) then the first letter (-25 points). Press Give
            up to end the round.
          </p>
        </form>
      ) : (
        <div style={finishedStyle}>
          <p style={scoreStyle}>
            Final score: <strong>{finalScore}</strong> / 100
          </p>
          <p style={answerRevealStyle}>
            The answer was: <strong>{puzzle.target}</strong>
          </p>
          <p style={factStyle}>{puzzle.fact}</p>
          <ShareButton
            text={`Guess the Game — Emoji: I scored ${finalScore}/100 on "${puzzle.target}". Can you beat me?`}
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

// --- Styles --------------------------------------------------------------

const sectionStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "var(--space-4)",
  maxWidth: "640px",
  margin: "0 auto",
  padding: "var(--space-4)",
};

const emojiContainerStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  padding: "var(--space-6) var(--space-3)",
  backgroundColor: "var(--color-surface-elevated)",
  borderRadius: "var(--radius-md)",
  border: "1px solid var(--color-border)",
};

const emojiStyle: React.CSSProperties = {
  fontSize: "var(--font-size-3xl)",
  letterSpacing: "0.5rem",
  lineHeight: "1.4",
};

const hintsContainerStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "var(--space-2)",
  padding: "var(--space-3)",
  backgroundColor: "var(--color-surface-elevated)",
  borderRadius: "var(--radius-md)",
  border: "1px solid var(--color-border)",
};

function hintItemStyle(isRevealed: boolean): React.CSSProperties {
  return {
    display: "flex",
    alignItems: "center",
    gap: "var(--space-2)",
    padding: "var(--space-2)",
    opacity: isRevealed ? 1 : 0.5,
  };
}

const hintIconStyle: React.CSSProperties = {
  fontSize: "var(--font-size-lg)",
  flexShrink: 0,
};

const hiddenHintStyle: React.CSSProperties = {
  color: "var(--color-text-muted)",
  fontStyle: "italic",
};

const wrongListStyle: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: "var(--space-1)",
};

const wrongChipStyle: React.CSSProperties = {
  padding: "var(--space-1) var(--space-2)",
  backgroundColor: "var(--color-error-bg)",
  color: "var(--color-error)",
  borderRadius: "var(--radius-sm)",
  fontSize: "var(--font-size-sm)",
  border: "1px solid var(--color-error)",
};

const formStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "var(--space-3)",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "var(--space-2) var(--space-3)",
  backgroundColor: "var(--color-surface)",
  color: "var(--color-text)",
  border: "1px solid var(--color-border)",
  borderRadius: "var(--radius-md)",
  fontSize: "var(--font-size-md)",
  fontFamily: "var(--font-body)",
  resize: "none",
};

const actionRowStyle: React.CSSProperties = {
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

const factStyle: React.CSSProperties = {
  margin: 0,
  color: "var(--color-text-muted)",
  fontStyle: "italic",
};
