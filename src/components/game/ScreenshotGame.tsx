"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";

import type { ScreenshotPuzzle } from "@/lib/content/schemas";
import { normalizeAnswer, isCorrectGuess } from "@/lib/game/match";
import { scoreScreenshot } from "@/lib/game/scoring";
import { usePreloadImage } from "@/lib/game/usePreloadImage";
import { recordModeResult } from "@/storage/actions";
import { useToast } from "@/components/ui/Toast";
import { GameImage } from "./GameImage";
import { ResultAnnouncer, type GameResult } from "./ResultAnnouncer";
import { ShareButton } from "./ShareButton";

export interface ScreenshotGameProps {
  puzzle: ScreenshotPuzzle;
  /** UTC date for progress recording (YYYY-MM-DD). */
  utcDate: string;
}

type Phase = "playing" | "solved" | "given_up";

/**
 * Blur-tier (px) lookup by level. Level 3 = heaviest blur (start); level 0 =
 * sharp. Each "sharpen" action drops one level (-25 per PRD §5.4). The px
 * values are tuned so each tier is visibly distinct but level 1 still gives
 * the player a fighting chance.
 */
const BLUR_PX_BY_LEVEL: ReadonlyArray<number> = [0, 6, 14, 24];
/** Starting blur level (heaviest). PRD §5.4: "starts fully blurred". */
const START_BLUR_LEVEL = 3;
/** Level 0 = fully sharp. Sharpening past this is a no-op. */
const SHARP_LEVEL = 0;
/** Max sharpen actions = START_BLUR_LEVEL - SHARP_LEVEL = 3. */

/**
 * Screenshot game board (PRD §5.4).
 *
 * Flow: a screenshot is shown fully blurred (level 3). The player types a
 * guess; each wrong guess is -20. The player may "sharpen" the image one level
 * at a time (3→2→1→0), each sharpen is -25. The score floors at 10; give-up
 * returns 0 and locks the record.
 *
 * Differences from Keywords/Emoji:
 *  - The clue is an image, rendered via `GameImage` with a `blurPx` filter.
 *  - "Sharpen" replaces "reveal next clue" / "use hint" — it reduces blur.
 *  - Max 3 sharpens (level 3 → 0), vs Keywords' 4-6 reveals / Emoji's 2 hints.
 *
 * Accessibility + storage patterns mirror KeywordsGame/EmojiGame (see those
 * components' docstrings). The blurred image still has a descriptive `alt` so
 * screen readers announce what the image depicts (the blur is a visual-only
 * challenge; SR users get the answer-equivalent via the guess mechanic).
 */
export function ScreenshotGame({ puzzle, utcDate }: ScreenshotGameProps) {
  const toast = useToast();
  const inputId = useId();
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const [guess, setGuess] = useState("");
  const [wrongGuesses, setWrongGuesses] = useState<string[]>([]);
  const [blurLevel, setBlurLevel] = useState(START_BLUR_LEVEL);
  const [phase, setPhase] = useState<Phase>("playing");
  const [result, setResult] = useState<GameResult>({ status: "idle" });

  const isFullySharp = blurLevel <= SHARP_LEVEL;
  const sharpensUsed = START_BLUR_LEVEL - blurLevel;

  // P1-10: preload the full-resolution image on mount so the LQIP (`blurSrc`)
  // shows instantly while the main WebP streams into the cache. The hook is
  // independent of GameImage's `priority`/`fetchPriority` hints — it explicitly
  // warms the HTTP cache via `new Image()`, guaranteeing the full image is
  // ready before the player sharpens to level 0.
  usePreloadImage(puzzle.image);

  const finalScore = useMemo(
    () =>
      scoreScreenshot({
        wrongGuesses: wrongGuesses.length,
        sharpens: sharpensUsed,
        gaveUp: phase === "given_up",
      }),
    [wrongGuesses.length, sharpensUsed, phase],
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
      const score = scoreScreenshot({
        wrongGuesses: wrongGuesses.length,
        sharpens: sharpensUsed,
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

  function handleSharpen() {
    if (phase !== "playing" || isFullySharp) return;
    setBlurLevel((prev) => Math.max(prev - 1, SHARP_LEVEL));
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
      const record = recordModeResult(utcDate, "screenshot", {
        puzzleId: puzzle.id,
        score,
        revealedClues: sharpensUsed, // sharpens = clues revealed for this mode
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

  // When solved/given_up, reveal the image fully sharp so the player sees it.
  const displayBlurLevel = phase === "playing" ? blurLevel : SHARP_LEVEL;
  const displayBlurPx = BLUR_PX_BY_LEVEL[displayBlurLevel] ?? 0;

  return (
    <section aria-labelledby="ss-game-heading" style={sectionStyle}>
      <h2 id="ss-game-heading" className="gtg-sr-only">
        Screenshot game
      </h2>

      {/* --- Screenshot (blurred until sharp/solved) ---------------------- */}
      <div aria-label="Screenshot puzzle" style={imageContainerStyle}>
        <GameImage
          src={puzzle.image}
          alt={`Screenshot clue: ${puzzle.target}`}
          width={640}
          height={360}
          priority
          blurPx={displayBlurPx}
          blurSrc={puzzle.blurSrc}
        />
        {phase === "playing" && (
          <p style={blurLevelLabelStyle} aria-live="polite">
            Blur level: {displayBlurLevel}/3 {isFullySharp ? "(sharp)" : ""}
          </p>
        )}
      </div>

      {/* --- Attribution (always visible — IP honesty) -------------------- */}
      <p style={attributionStyle}>
        Image: {puzzle.imageAttribution} ({puzzle.imageLicense})
      </p>

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
            aria-describedby="ss-game-instructions"
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
              onClick={handleSharpen}
              disabled={isFullySharp}
            >
              Sharpen ({sharpensUsed}/3)
            </button>
            <button
              type="button"
              className="gtg-btn gtg-btn-ghost gtg-btn-md"
              onClick={handleGiveUp}
            >
              Give up
            </button>
          </div>
          <p id="ss-game-instructions" className="gtg-sr-only">
            Type a guess and press Enter or Submit. Use Sharpen to reduce the
            blur one level (-25 points each, max 3). Press Give up to end the
            round.
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
            text={`Guess the Game — Screenshot: I scored ${finalScore}/100 on "${puzzle.target}". Can you beat me?`}
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

const imageContainerStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: "var(--space-2)",
  padding: "var(--space-3)",
  backgroundColor: "var(--color-surface-elevated)",
  borderRadius: "var(--radius-md)",
  border: "1px solid var(--color-border)",
};

const blurLevelLabelStyle: React.CSSProperties = {
  color: "var(--color-text-muted)",
  fontSize: "var(--font-size-sm)",
  margin: 0,
};

const attributionStyle: React.CSSProperties = {
  color: "var(--color-text-muted)",
  fontSize: "var(--font-size-xs)",
  margin: 0,
  textAlign: "center",
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
