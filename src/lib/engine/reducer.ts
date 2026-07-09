/**
 * Game reducer — pure function, handles all game actions.
 * No React, no DOM, no localStorage.
 */

import { matchGuess } from "./match";
import {
  calculateKeywordsScore,
  calculateEmojiScore,
  calculateScreenshotScore,
  calculateTimelineScore,
  calculatePositionErrors,
} from "./scoring";
import type { GameState, GameAction } from "./state";

function isGameActive(state: GameState): boolean {
  return state.status === "playing" || state.status === "idle";
}

function guessAlreadyMade(state: GameState, guess: string): boolean {
  return state.guesses.some((g) => g.toLowerCase() === guess.toLowerCase());
}

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case "RESET":
      return {
        ...state,
        status: "idle",
        score: 0,
        guesses: [],
        startedAt: Date.now(),
        endedAt: null,
        ...(state.mode === "keywords" ? { revealedCount: 0, wrongGuesses: 0 } : {}),
        ...(state.mode === "emoji" ? {
          wrongGuesses: 0,
          hintsUsed: 0,
          categoryRevealed: false,
          firstLetterRevealed: false,
        } : {}),
        ...(state.mode === "screenshot" ? { wrongGuesses: 0, sharpensUsed: 0 } : {}),
        ...(state.mode === "timeline" ? { hintsUsed: 0, submitted: false, currentOrder: [...state.correctOrder].sort(() => Math.random() - 0.5) } : {}),
      };

    case "GIVE_UP":
      if (!isGameActive(state)) return state;
      return {
        ...state,
        status: "given-up",
        score: 0,
        endedAt: Date.now(),
      };

    case "GUESS": {
      if (!isGameActive(state)) return state;
      const guess = action.guess.trim();
      if (!guess) return state;
      if (guessAlreadyMade(state, guess)) return state;

      const newGuesses = [...state.guesses, guess];

      if (state.mode === "keywords") {
        const correct = matchGuess(guess, state.target, state.aliases);
        if (correct) {
          return {
            ...state,
            status: "won",
            guesses: newGuesses,
            score: calculateKeywordsScore(state.revealedCount, state.wrongGuesses),
            endedAt: Date.now(),
          };
        }
        return {
          ...state,
          status: "playing",
          guesses: newGuesses,
          wrongGuesses: state.wrongGuesses + 1,
        };
      }

      if (state.mode === "emoji") {
        const correct = matchGuess(guess, state.target, state.aliases);
        if (correct) {
          return {
            ...state,
            status: "won",
            guesses: newGuesses,
            score: calculateEmojiScore(state.wrongGuesses, state.hintsUsed),
            endedAt: Date.now(),
          };
        }
        return {
          ...state,
          status: "playing",
          guesses: newGuesses,
          wrongGuesses: state.wrongGuesses + 1,
        };
      }

      if (state.mode === "screenshot") {
        const correct = matchGuess(guess, state.target, state.aliases);
        if (correct) {
          return {
            ...state,
            status: "won",
            guesses: newGuesses,
            score: calculateScreenshotScore(state.wrongGuesses, state.sharpensUsed),
            endedAt: Date.now(),
          };
        }
        return {
          ...state,
          status: "playing",
          guesses: newGuesses,
          wrongGuesses: state.wrongGuesses + 1,
        };
      }

      // Timeline doesn't use GUESS — uses REORDER + SUBMIT_TIMELINE
      return state;
    }

    case "REVEAL_KEYWORD": {
      if (state.mode !== "keywords" || !isGameActive(state)) return state;
      if (state.revealedCount >= state.totalKeywords) return state;
      return {
        ...state,
        status: "playing",
        revealedCount: state.revealedCount + 1,
      };
    }

    case "USE_HINT": {
      if (!isGameActive(state)) return state;

      if (state.mode === "emoji") {
        if (action.hintType === "category" && !state.categoryRevealed) {
          return { ...state, status: "playing", hintsUsed: state.hintsUsed + 1, categoryRevealed: true };
        }
        if (action.hintType === "firstLetter" && !state.firstLetterRevealed) {
          return { ...state, status: "playing", hintsUsed: state.hintsUsed + 1, firstLetterRevealed: true };
        }
        return state;
      }

      if (state.mode === "timeline") {
        if (state.hintsUsed >= state.maxHints) return state;
        return { ...state, status: "playing", hintsUsed: state.hintsUsed + 1 };
      }

      return state;
    }

    case "SHARPEN": {
      if (state.mode !== "screenshot" || !isGameActive(state)) return state;
      if (state.sharpensUsed >= state.maxSharpens) return state;
      return {
        ...state,
        status: "playing",
        sharpensUsed: state.sharpensUsed + 1,
      };
    }

    case "REORDER": {
      if (state.mode !== "timeline" || !isGameActive(state)) return state;
      return {
        ...state,
        status: "playing",
        currentOrder: action.newOrder,
      };
    }

    case "SUBMIT_TIMELINE": {
      if (state.mode !== "timeline" || !isGameActive(state)) return state;
      if (state.submitted) return state;

      const errors = calculatePositionErrors(state.currentOrder, state.correctOrder);
      const won = errors === 0;
      const score = calculateTimelineScore(errors, state.hintsUsed);

      return {
        ...state,
        status: won ? "won" : "lost",
        submitted: true,
        score,
        endedAt: Date.now(),
      };
    }

    default:
      return state;
  }
}
