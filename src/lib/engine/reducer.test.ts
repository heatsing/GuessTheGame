import { describe, it, expect } from "vitest";
import { gameReducer } from "./reducer";
import type { KeywordsState, EmojiState, ScreenshotState, TimelineState } from "./state";

function makeKeywordsState(overrides: Partial<KeywordsState> = {}): KeywordsState {
  return {
    puzzleId: "kw-001",
    mode: "keywords",
    status: "playing",
    score: 0,
    guesses: [],
    startedAt: 1000,
    endedAt: null,
    revealedCount: 0,
    wrongGuesses: 0,
    totalKeywords: 6,
    target: "Volcano",
    aliases: ["volcano"],
    ...overrides,
  };
}

function makeEmojiState(overrides: Partial<EmojiState> = {}): EmojiState {
  return {
    puzzleId: "em-001",
    mode: "emoji",
    status: "playing",
    score: 0,
    guesses: [],
    startedAt: 1000,
    endedAt: null,
    wrongGuesses: 0,
    hintsUsed: 0,
    categoryRevealed: false,
    firstLetterRevealed: false,
    target: "Volcano",
    aliases: ["volcano"],
    ...overrides,
  };
}

function makeScreenshotState(overrides: Partial<ScreenshotState> = {}): ScreenshotState {
  return {
    puzzleId: "ss-001",
    mode: "screenshot",
    status: "playing",
    score: 0,
    guesses: [],
    startedAt: 1000,
    endedAt: null,
    wrongGuesses: 0,
    sharpensUsed: 0,
    maxSharpens: 3,
    target: "Mount Everest",
    aliases: ["everest", "mt everest"],
    ...overrides,
  };
}

function makeTimelineState(overrides: Partial<TimelineState> = {}): TimelineState {
  return {
    puzzleId: "tl-001",
    mode: "timeline",
    status: "playing",
    score: 0,
    guesses: [],
    startedAt: 1000,
    endedAt: null,
    currentOrder: ["item-0", "item-1", "item-2", "item-3"],
    correctOrder: ["item-0", "item-1", "item-2", "item-3"],
    hintsUsed: 0,
    maxHints: 2,
    submitted: false,
    ...overrides,
  };
}

describe("gameReducer — Keywords", () => {
  it("correct guess wins and calculates score", () => {
    const state = makeKeywordsState({ revealedCount: 2, wrongGuesses: 1 });
    const next = gameReducer(state, { type: "GUESS", guess: "Volcano" });
    expect(next.status).toBe("won");
    expect(next.score).toBe(100 - 15 * 2 - 10 * 1); // 60
    expect(next.endedAt).not.toBeNull();
  });

  it("correct guess via alias wins", () => {
    const state = makeKeywordsState();
    const next = gameReducer(state, { type: "GUESS", guess: "volcano" });
    expect(next.status).toBe("won");
  });

  it("wrong guess increments wrongGuesses and records guess", () => {
    const state = makeKeywordsState();
    const next = gameReducer(state, { type: "GUESS", guess: "mountain" }) as KeywordsState;
    expect(next.status).toBe("playing");
    expect(next.wrongGuesses).toBe(1);
    expect(next.guesses).toContain("mountain");
  });

  it("duplicate guess is blocked", () => {
    const state = makeKeywordsState({ guesses: ["mountain"], wrongGuesses: 1 });
    const next = gameReducer(state, { type: "GUESS", guess: "mountain" }) as KeywordsState;
    expect(next.wrongGuesses).toBe(1);
    expect(next.guesses.length).toBe(1);
  });

  it("empty guess is ignored", () => {
    const state = makeKeywordsState();
    const next = gameReducer(state, { type: "GUESS", guess: "   " });
    expect(next).toEqual(state);
  });

  it("REVEAL_KEYWORD increments revealedCount", () => {
    const state = makeKeywordsState();
    const next = gameReducer(state, { type: "REVEAL_KEYWORD" }) as KeywordsState;
    expect(next.revealedCount).toBe(1);
    expect(next.status).toBe("playing");
  });

  it("REVEAL_KEYWORD does not exceed totalKeywords", () => {
    const state = makeKeywordsState({ revealedCount: 6 });
    const next = gameReducer(state, { type: "REVEAL_KEYWORD" }) as KeywordsState;
    expect(next.revealedCount).toBe(6);
  });

  it("GIVE_UP sets score to 0 and status to given-up", () => {
    const state = makeKeywordsState({ revealedCount: 1, wrongGuesses: 1 });
    const next = gameReducer(state, { type: "GIVE_UP" });
    expect(next.status).toBe("given-up");
    expect(next.score).toBe(0);
    expect(next.endedAt).not.toBeNull();
  });
});

describe("gameReducer — Emoji", () => {
  it("correct guess wins", () => {
    const state = makeEmojiState({ wrongGuesses: 1, hintsUsed: 1 });
    const next = gameReducer(state, { type: "GUESS", guess: "Volcano" });
    expect(next.status).toBe("won");
    expect(next.score).toBe(100 - 20 * 1 - 25 * 1); // 55
  });

  it("USE_HINT category reveals category", () => {
    const state = makeEmojiState();
    const next = gameReducer(state, { type: "USE_HINT", hintType: "category" }) as EmojiState;
    expect(next.categoryRevealed).toBe(true);
    expect(next.hintsUsed).toBe(1);
  });

  it("USE_HINT firstLetter reveals firstLetter", () => {
    const state = makeEmojiState();
    const next = gameReducer(state, { type: "USE_HINT", hintType: "firstLetter" }) as EmojiState;
    expect(next.firstLetterRevealed).toBe(true);
    expect(next.hintsUsed).toBe(1);
  });

  it("cannot use same hint twice", () => {
    const state = makeEmojiState({ categoryRevealed: true, hintsUsed: 1 });
    const next = gameReducer(state, { type: "USE_HINT", hintType: "category" }) as EmojiState;
    expect(next.hintsUsed).toBe(1);
  });
});

describe("gameReducer — Screenshot", () => {
  it("correct guess wins", () => {
    const state = makeScreenshotState({ wrongGuesses: 1, sharpensUsed: 2 });
    const next = gameReducer(state, { type: "GUESS", guess: "Everest" });
    expect(next.status).toBe("won");
    expect(next.score).toBe(100 - 20 * 1 - 25 * 2); // 30
  });

  it("SHARPEN increments sharpensUsed", () => {
    const state = makeScreenshotState();
    const next = gameReducer(state, { type: "SHARPEN" }) as ScreenshotState;
    expect(next.sharpensUsed).toBe(1);
  });

  it("SHARPEN does not exceed maxSharpens", () => {
    const state = makeScreenshotState({ sharpensUsed: 3 });
    const next = gameReducer(state, { type: "SHARPEN" }) as ScreenshotState;
    expect(next.sharpensUsed).toBe(3);
  });
});

describe("gameReducer — Timeline", () => {
  it("SUBMIT_TIMELINE with correct order wins", () => {
    const state = makeTimelineState();
    const next = gameReducer(state, { type: "SUBMIT_TIMELINE" }) as TimelineState;
    expect(next.status).toBe("won");
    expect(next.score).toBe(100);
    expect(next.submitted).toBe(true);
  });

  it("SUBMIT_TIMELINE with wrong order loses and scores", () => {
    const state = makeTimelineState({
      currentOrder: ["item-1", "item-0", "item-2", "item-3"],
    });
    const next = gameReducer(state, { type: "SUBMIT_TIMELINE" }) as TimelineState;
    expect(next.status).toBe("lost");
    expect(next.score).toBe(100 - 15 * 2); // 70
  });

  it("REORDER updates currentOrder", () => {
    const state = makeTimelineState();
    const next = gameReducer(state, { type: "REORDER", newOrder: ["item-3", "item-2", "item-1", "item-0"] }) as TimelineState;
    expect(next.currentOrder).toEqual(["item-3", "item-2", "item-1", "item-0"]);
  });

  it("USE_HINT increments hintsUsed up to maxHints", () => {
    const state = makeTimelineState({ hintsUsed: 2 });
    const next = gameReducer(state, { type: "USE_HINT" }) as TimelineState;
    expect(next.hintsUsed).toBe(2);
  });

  it("cannot submit twice", () => {
    const state = makeTimelineState({ submitted: true, status: "won" });
    const next = gameReducer(state, { type: "SUBMIT_TIMELINE" });
    expect(next).toEqual(state);
  });
});

describe("gameReducer — ended game", () => {
  it("GUESS on won game is ignored", () => {
    const state = makeKeywordsState({ status: "won", score: 80, guesses: ["volcano"] });
    const next = gameReducer(state, { type: "GUESS", guess: "mountain" });
    expect(next).toEqual(state);
  });

  it("GUESS on given-up game is ignored", () => {
    const state = makeKeywordsState({ status: "given-up", score: 0 });
    const next = gameReducer(state, { type: "GUESS", guess: "volcano" });
    expect(next).toEqual(state);
  });

  it("REVEAL_KEYWORD on ended game is ignored", () => {
    const state = makeKeywordsState({ status: "won", revealedCount: 2 });
    const next = gameReducer(state, { type: "REVEAL_KEYWORD" });
    expect(next).toEqual(state);
  });
});

describe("gameReducer — RESET", () => {
  it("resets keywords state", () => {
    const state = makeKeywordsState({
      status: "won",
      score: 80,
      guesses: ["volcano"],
      revealedCount: 3,
      wrongGuesses: 2,
    });
    const next = gameReducer(state, { type: "RESET" });
    expect(next.status).toBe("idle");
    expect(next.score).toBe(0);
    expect(next.guesses).toEqual([]);
  });
});
