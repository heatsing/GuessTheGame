"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";

import type { KeywordsPuzzle } from "@/lib/content/schemas";
import { normalizeAnswer, isCorrectGuess } from "@/lib/game/match";
import { scoreKeywords } from "@/lib/game/scoring";
import { recordModeResult } from "@/storage/actions";
import { useToast } from "@/components/ui/Toast";
import { ResultAnnouncer, type GameResult } from "./ResultAnnouncer";
import { ShareButton } from "./ShareButton";

export interface KeywordsGameProps {
  puzzle: KeywordsPuzzle;
  /** UTC date for progress recording (YYYY-MM-DD). */
  utcDate: string;
}

type Phase = "playing" | "solved" | "given_up";

/**
 * Keywords game board (PRD §5.2).
 *
 * Flow: 4-6 keyword clues are hidden, revealed one at a time from vague →
 * specific. The player types a guess; `normalizeAnswer` + aliases decide a
 * correct match. Each wrong guess is -10, each revealed keyword is -15. The
 * score floors at 10; give-up returns 0 and locks the record (storage layer
 * enforces the terminal lock, so a later solve cannot overwrite it).
 *
 * Accessibility:
 *  - Result announced via `ResultAnnouncer` (aria-live polite, P2-38).
 *  - The guess input is labeled and has a live region for wrong-guess feedback.
 *  - Reveal button is disabled at the last clue.
 *  - Keyboard: Enter submits, the input is auto-focused on mount.
 *  - Storage errors surface via Toast (not alert).
 *
 * No localStorage calls in this component (guardrail #9) — all persistence
 * goes through `recordModeResult` in `src/storage/actions.ts`.
 */
export function KeywordsGame({ puzzle, utcDate }: KeywordsGameProps) {
  const toast = useToast();
  const inputId = useId();
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Always reveal the first (vaguest) keyword so the player has a starting
  // point. The remaining clues are hidden until "Reveal next" is pressed.
  const [revealedCount, setRevealedCount] = useState(1);
  const [guess, setGuess] = useState("");
  const [wrongGuesses, setWrongGuesses] = useState<string[]>([]);
  const [phase, setPhase] = useState<Phase>("playing");
  const [result, setResult] = useState<GameResult>({ status: "idle" });

  const totalClues = puzzle.keywords.length;
  const isLastClueRevealed = revealedCount >= totalClues;

  const finalScore = useMemo(
    () =>
      scoreKeywords({
        wrongGuesses: wrongGuesses.length,
        revealedKeywords: revealedCount - 1, // first clue is free (no penalty)
        gaveUp: phase === "given_up",
      }),
    [wrongGuesses.length, revealedCount, phase],
  );

  // Auto-focus the input on mount and after a wrong guess (so the player can
  // immediately type again without re-tabbing).
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
      const score = scoreKeywords({
        wrongGuesses: wrongGuesses.length,
        revealedKeywords: revealedCount - 1,
      });
      finishGame("solved", score);
      setGuess("");
      return;
    }

    // Wrong guess — record and announce. De-duplicate case variants so the
    // penalty list does not grow with "Volcano" / "VOLCANO" / "volcano".
    if (!wrongGuesses.includes(normalized)) {
      setWrongGuesses((prev) => [...prev, normalized]);
    }
    setResult({ status: "wrong", guess: trimmed });
    setGuess("");
    inputRef.current?.focus();
  }

  function handleRevealNext() {
    if (phase !== "playing" || isLastClueRevealed) return;
    setRevealedCount((prev) => Math.min(prev + 1, totalClues));
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

    // Persist via the storage adapter (guardrail #9). recordModeResult is
    // idempotent and applies the given_up terminal lock, so a double-submit
    // or a later solve attempt is a no-op.
    try {
      const record = recordModeResult(utcDate, "keywords", {
        puzzleId: puzzle.id,
        score,
        revealedClues: revealedCount,
        wrongGuesses,
        status: nextPhase,
      });
      if (!record.changed) {
        // Idempotent no-op — not an error, but worth a quiet toast so the
        // player knows the result was already recorded.
        toast.showToast("Result already recorded.", "info");
      }
    } catch {
      // Storage unavailable / quota — do not block the UI. The player still
      // sees their result; only persistence failed.
      toast.showToast("Could not save progress (storage unavailable).", "error");
    }
  }

  return (
    <section
      aria-labelledby="kw-game-heading"
      style={sectionStyle}
      aria-busy={phase === "playing" ? undefined : "false"}
    >
      <h2 id="kw-game-heading" className="gtg-sr-only">
        Keywords game
      </h2>

      {/* --- Clues --------------------------------------------------------- */}
      <div aria-label="Keyword clues" style={cluesContainerStyle}>
        {puzzle.keywords.map((keyword, index) => {
          const isRevealed = index < revealedCount;
          return (
            <div key={index} style={clueItemStyle(isRevealed)}>
              <span aria-hidden="true" style={clueNumberStyle}>
                {index + 1}
              </span>
              {isRevealed ? (
                <span>{keyword}</span>
              ) : (
                <span aria-label={`Clue ${index + 1} hidden`} style={hiddenClueStyle}>
                  ●●●●
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* --- Result announcer (always rendered for SR) --------------------- */}
      <ResultAnnouncer result={result} />

      {/* --- Wrong-guess history (visual) ---------------------------------- */}
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
            aria-describedby="kw-game-instructions"
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
              onClick={handleRevealNext}
              disabled={isLastClueRevealed}
            >
              Reveal next clue ({revealedCount}/{totalClues})
            </button>
            <button
              type="button"
              className="gtg-btn gtg-btn-ghost gtg-btn-md"
              onClick={handleGiveUp}
            >
              Give up
            </button>
          </div>
          <p id="kw-game-instructions" className="gtg-sr-only">
            Type a guess and press Enter or Submit. Use Reveal next clue for a
            hint (-15 points each). Press Give up to end the round.
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
            text={`Guess the Game — Keywords: I scored ${finalScore}/100 on "${puzzle.target}". Can you beat me?`}
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

const cluesContainerStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "var(--space-2)",
  padding: "var(--space-3)",
  backgroundColor: "var(--color-surface-elevated)",
  borderRadius: "var(--radius-md)",
  border: "1px solid var(--color-border)",
};

function clueItemStyle(isRevealed: boolean): React.CSSProperties {
  return {
    display: "flex",
    alignItems: "center",
    gap: "var(--space-2)",
    padding: "var(--space-2)",
    opacity: isRevealed ? 1 : 0.5,
    fontStyle: isRevealed ? "normal" : "italic",
  };
}

const clueNumberStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: "1.5rem",
  height: "1.5rem",
  borderRadius: "50%",
  backgroundColor: "var(--color-primary)",
  color: "var(--color-text-on-primary)",
  fontSize: "var(--font-size-sm)",
  fontWeight: "var(--font-weight-semibold)",
  flexShrink: 0,
};

const hiddenClueStyle: React.CSSProperties = {
  letterSpacing: "0.25rem",
  color: "var(--color-text-muted)",
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
