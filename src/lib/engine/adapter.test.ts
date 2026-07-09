import { describe, it, expect } from "vitest";
import {
  keywordsAdapter,
  emojiAdapter,
  screenshotAdapter,
  timelineAdapter,
  getAdapter,
} from "./adapter";

const keywordsPuzzle = {
  id: "kw-001",
  mode: "keywords" as const,
  domain: "geography" as const,
  target: "Volcano",
  aliases: ["volcano"],
  keywords: ["mountain", "heat", "lava", "eruption", "magma", "crater"],
  fact: "A volcano is a rupture in the crust.",
};

const emojiPuzzle = {
  id: "em-001",
  mode: "emoji" as const,
  domain: "geography" as const,
  target: "Volcano",
  aliases: ["volcano"],
  emojis: ["🌋", "💨", "🔥"],
  hints: { category: "Geography", firstLetter: "V" },
  fact: "...",
};

const screenshotPuzzle = {
  id: "ss-001",
  mode: "screenshot" as const,
  domain: "nature" as const,
  target: "Mount Everest",
  aliases: ["everest", "mt everest"],
  image: "/images/puzzles/ss-001.webp",
  imageLicense: "public-domain",
  imageAttribution: "NASA",
  fact: "...",
};

const timelinePuzzle = {
  id: "tl-001",
  mode: "timeline" as const,
  domain: "history" as const,
  target: "Inventions",
  aliases: [],
  items: [
    { title: "Printing press", description: "Gutenberg", date: 1440 },
    { title: "Steam engine", description: "Watt", date: 1769 },
    { title: "Airplane", description: "Wright brothers", date: 1903 },
    { title: "Moon landing", description: "Apollo 11", date: 1969 },
  ],
  fact: "...",
};

describe("keywordsAdapter", () => {
  it("creates initial state from puzzle", () => {
    const state = keywordsAdapter.createInitialState("kw-001", keywordsPuzzle);
    expect(state.mode).toBe("keywords");
    expect(state.status).toBe("idle");
    expect(state.target).toBe("Volcano");
    expect(state.totalKeywords).toBe(6);
    expect(state.revealedCount).toBe(0);
  });

  it("canSubmit returns true for idle/playing", () => {
    expect(keywordsAdapter.canSubmit({ ...keywordsAdapter.createInitialState("kw-001", keywordsPuzzle), status: "idle" })).toBe(true);
    expect(keywordsAdapter.canSubmit({ ...keywordsAdapter.createInitialState("kw-001", keywordsPuzzle), status: "playing" })).toBe(true);
    expect(keywordsAdapter.canSubmit({ ...keywordsAdapter.createInitialState("kw-001", keywordsPuzzle), status: "won" })).toBe(false);
  });

  it("getProgress returns revealed/total", () => {
    const state = { ...keywordsAdapter.createInitialState("kw-001", keywordsPuzzle), revealedCount: 3 };
    expect(keywordsAdapter.getProgress(state)).toEqual({ current: 3, max: 6 });
  });

  it("serialize/deserialize round-trips", () => {
    const state = keywordsAdapter.createInitialState("kw-001", keywordsPuzzle);
    const data = keywordsAdapter.serialize(state);
    const restored = keywordsAdapter.deserialize(data);
    expect(restored).toEqual(state);
  });
});

describe("emojiAdapter", () => {
  it("creates initial state from puzzle", () => {
    const state = emojiAdapter.createInitialState("em-001", emojiPuzzle);
    expect(state.mode).toBe("emoji");
    expect(state.target).toBe("Volcano");
    expect(state.categoryRevealed).toBe(false);
  });

  it("getProgress returns hintsUsed/2", () => {
    const state = { ...emojiAdapter.createInitialState("em-001", emojiPuzzle), hintsUsed: 1 };
    expect(emojiAdapter.getProgress(state)).toEqual({ current: 1, max: 2 });
  });
});

describe("screenshotAdapter", () => {
  it("creates initial state from puzzle", () => {
    const state = screenshotAdapter.createInitialState("ss-001", screenshotPuzzle);
    expect(state.mode).toBe("screenshot");
    expect(state.target).toBe("Mount Everest");
    expect(state.maxSharpens).toBe(3);
    expect(state.sharpensUsed).toBe(0);
  });

  it("getProgress returns sharpensUsed/3", () => {
    const state = { ...screenshotAdapter.createInitialState("ss-001", screenshotPuzzle), sharpensUsed: 2 };
    expect(screenshotAdapter.getProgress(state)).toEqual({ current: 2, max: 3 });
  });
});

describe("timelineAdapter", () => {
  it("creates initial state from puzzle with correct order", () => {
    const state = timelineAdapter.createInitialState("tl-001", timelinePuzzle);
    expect(state.mode).toBe("timeline");
    expect(state.correctOrder).toEqual(["item-0", "item-1", "item-2", "item-3"]);
    expect(state.currentOrder).toHaveLength(4);
    expect(state.submitted).toBe(false);
  });

  it("serialize/deserialize round-trips", () => {
    const state = timelineAdapter.createInitialState("tl-001", timelinePuzzle);
    const data = timelineAdapter.serialize(state);
    const restored = timelineAdapter.deserialize(data);
    expect(restored).toEqual(state);
  });
});

describe("getAdapter", () => {
  it("returns correct adapter for each mode", () => {
    expect(getAdapter("keywords").mode).toBe("keywords");
    expect(getAdapter("emoji").mode).toBe("emoji");
    expect(getAdapter("screenshot").mode).toBe("screenshot");
    expect(getAdapter("timeline").mode).toBe("timeline");
  });
});
