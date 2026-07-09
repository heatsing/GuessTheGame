/**
 * Mode adapter interface — provides mode-specific operations
 * without coupling to React or UI concerns.
 */

import type {
  GameMode,
  GameState,
  KeywordsState,
  EmojiState,
  ScreenshotState,
  TimelineState,
} from "./state";

export interface ModeAdapter<TState extends GameState> {
  readonly mode: GameMode;
  createInitialState(puzzleId: string, puzzle: unknown): TState;
  canSubmit(state: TState): boolean;
  getProgress(state: TState): { current: number; max: number };
  serialize(state: TState): string;
  deserialize(data: string): TState;
}

interface KeywordsPuzzle {
  id: string;
  mode: "keywords";
  target: string;
  aliases: string[];
  keywords: string[];
}

interface EmojiPuzzle {
  id: string;
  mode: "emoji";
  target: string;
  aliases: string[];
  hints: { category: string; firstLetter: string };
}

interface ScreenshotPuzzle {
  id: string;
  mode: "screenshot";
  target: string;
  aliases: string[];
}

interface TimelinePuzzle {
  id: string;
  mode: "timeline";
  items: { title: string; description: string; date: number }[];
}

export const keywordsAdapter: ModeAdapter<KeywordsState> = {
  mode: "keywords",
  createInitialState(puzzleId, puzzle: unknown) {
    const p = puzzle as KeywordsPuzzle;
    return {
      puzzleId,
      mode: "keywords",
      status: "idle",
      score: 0,
      guesses: [],
      startedAt: Date.now(),
      endedAt: null,
      revealedCount: 0,
      wrongGuesses: 0,
      totalKeywords: p.keywords.length,
      target: p.target,
      aliases: p.aliases ?? [],
    };
  },
  canSubmit(state) {
    return state.status === "playing" || state.status === "idle";
  },
  getProgress(state) {
    return { current: state.revealedCount, max: state.totalKeywords };
  },
  serialize(state) {
    return JSON.stringify(state);
  },
  deserialize(data) {
    return JSON.parse(data) as KeywordsState;
  },
};

export const emojiAdapter: ModeAdapter<EmojiState> = {
  mode: "emoji",
  createInitialState(puzzleId, puzzle: unknown) {
    const p = puzzle as EmojiPuzzle;
    return {
      puzzleId,
      mode: "emoji",
      status: "idle",
      score: 0,
      guesses: [],
      startedAt: Date.now(),
      endedAt: null,
      wrongGuesses: 0,
      hintsUsed: 0,
      categoryRevealed: false,
      firstLetterRevealed: false,
      target: p.target,
      aliases: p.aliases ?? [],
    };
  },
  canSubmit(state) {
    return state.status === "playing" || state.status === "idle";
  },
  getProgress(state) {
    return { current: state.hintsUsed, max: 2 };
  },
  serialize(state) {
    return JSON.stringify(state);
  },
  deserialize(data) {
    return JSON.parse(data) as EmojiState;
  },
};

export const screenshotAdapter: ModeAdapter<ScreenshotState> = {
  mode: "screenshot",
  createInitialState(puzzleId, puzzle: unknown) {
    const p = puzzle as ScreenshotPuzzle;
    return {
      puzzleId,
      mode: "screenshot",
      status: "idle",
      score: 0,
      guesses: [],
      startedAt: Date.now(),
      endedAt: null,
      wrongGuesses: 0,
      sharpensUsed: 0,
      maxSharpens: 3,
      target: p.target,
      aliases: p.aliases ?? [],
    };
  },
  canSubmit(state) {
    return state.status === "playing" || state.status === "idle";
  },
  getProgress(state) {
    return { current: state.sharpensUsed, max: state.maxSharpens };
  },
  serialize(state) {
    return JSON.stringify(state);
  },
  deserialize(data) {
    return JSON.parse(data) as ScreenshotState;
  },
};

export const timelineAdapter: ModeAdapter<TimelineState> = {
  mode: "timeline",
  createInitialState(puzzleId, puzzle: unknown) {
    const p = puzzle as TimelinePuzzle;
    const correctOrder = [...p.items]
      .sort((a, b) => a.date - b.date)
      .map((item, i) => `item-${i}`);
    const shuffled = [...correctOrder].sort(() => Math.random() - 0.5);
    return {
      puzzleId,
      mode: "timeline",
      status: "idle",
      score: 0,
      guesses: [],
      startedAt: Date.now(),
      endedAt: null,
      currentOrder: shuffled,
      correctOrder,
      hintsUsed: 0,
      maxHints: 2,
      submitted: false,
    };
  },
  canSubmit(state) {
    return (state.status === "playing" || state.status === "idle") && !state.submitted;
  },
  getProgress(state) {
    return { current: state.hintsUsed, max: state.maxHints };
  },
  serialize(state) {
    return JSON.stringify(state);
  },
  deserialize(data) {
    return JSON.parse(data) as TimelineState;
  },
};

export function getAdapter(mode: GameMode): ModeAdapter<GameState> {
  switch (mode) {
    case "keywords": return keywordsAdapter as ModeAdapter<GameState>;
    case "emoji": return emojiAdapter as ModeAdapter<GameState>;
    case "screenshot": return screenshotAdapter as ModeAdapter<GameState>;
    case "timeline": return timelineAdapter as ModeAdapter<GameState>;
  }
}
