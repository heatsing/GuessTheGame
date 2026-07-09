/**
 * Game state types — discriminated union by mode.
 * All states are serializable (no functions, no class instances).
 */

export type GameMode = "keywords" | "emoji" | "screenshot" | "timeline";
export type GameStatus = "idle" | "playing" | "won" | "lost" | "given-up";

export interface BaseGameState {
  puzzleId: string;
  mode: GameMode;
  status: GameStatus;
  score: number;
  guesses: string[];
  startedAt: number;
  endedAt: number | null;
}

export interface KeywordsState extends BaseGameState {
  mode: "keywords";
  revealedCount: number;
  wrongGuesses: number;
  totalKeywords: number;
  target: string;
  aliases: string[];
}

export interface EmojiState extends BaseGameState {
  mode: "emoji";
  wrongGuesses: number;
  hintsUsed: number;
  categoryRevealed: boolean;
  firstLetterRevealed: boolean;
  target: string;
  aliases: string[];
}

export interface ScreenshotState extends BaseGameState {
  mode: "screenshot";
  wrongGuesses: number;
  sharpensUsed: number;
  maxSharpens: number;
  target: string;
  aliases: string[];
}

export interface TimelineState extends BaseGameState {
  mode: "timeline";
  currentOrder: string[];
  correctOrder: string[];
  hintsUsed: number;
  maxHints: number;
  submitted: boolean;
}

export type GameState =
  | KeywordsState
  | EmojiState
  | ScreenshotState
  | TimelineState;

export type GameAction =
  | { type: "GUESS"; guess: string }
  | { type: "REVEAL_KEYWORD" }
  | { type: "USE_HINT"; hintType?: "category" | "firstLetter" | "date"; itemId?: string }
  | { type: "SHARPEN" }
  | { type: "REORDER"; newOrder: string[] }
  | { type: "SUBMIT_TIMELINE" }
  | { type: "GIVE_UP" }
  | { type: "RESET" };
