import { beforeEach, describe, expect, it } from "vitest";

import { __setAdapterForTesting, createMemoryAdapter } from "./adapter";
import { getProgress, recordModeResult } from "./actions";
import { loadState, resetState } from "./client";

/** Edge cases that complement the core storage test suites. */

function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

function daysAgo(n: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().slice(0, 10);
}

beforeEach(() => {
  __setAdapterForTesting(createMemoryAdapter());
});

describe("daily date boundary", () => {
  it("keeps progress for different days independent", () => {
    const dayA = daysAgo(1);
    const dayB = todayUtc();

    recordModeResult(dayA, "keywords", {
      puzzleId: "kw-001",
      score: 80,
      revealedClues: 3,
      wrongGuesses: ["mountain"],
      status: "solved",
    });

    recordModeResult(dayB, "keywords", {
      puzzleId: "kw-002",
      score: 60,
      revealedClues: 4,
      wrongGuesses: [],
      status: "solved",
    });

    const a = getProgress(dayA);
    const b = getProgress(dayB);
    expect(a?.kw?.puzzleId).toBe("kw-001");
    expect(b?.kw?.puzzleId).toBe("kw-002");
    expect(a?.kw?.score).toBe(80);
    expect(b?.kw?.score).toBe(60);
  });

  it("preserves yesterday's progress when a new day starts", () => {
    const yesterday = daysAgo(1);
    recordModeResult(yesterday, "emoji", {
      puzzleId: "em-001",
      score: 100,
      revealedClues: 1,
      wrongGuesses: [],
      status: "solved",
    });

    // A new day begins — record a different day's progress
    recordModeResult(todayUtc(), "emoji", {
      puzzleId: "em-002",
      score: 50,
      revealedClues: 3,
      wrongGuesses: ["octopus"],
      status: "solved",
    });

    const yesterdayProgress = getProgress(yesterday);
    expect(yesterdayProgress?.em?.score).toBe(100);
  });
});

describe("missing puzzle reference", () => {
  it("still stores progress for a puzzleId not present in the content bank", () => {
    // Storage is intentionally agnostic of content existence; a stale puzzleId
    // (e.g., removed content) must not corrupt the persisted state.
    recordModeResult(todayUtc(), "screenshot", {
      puzzleId: "ss-999", // not in any content fixture
      score: 70,
      revealedClues: 2,
      wrongGuesses: ["desert"],
      status: "solved",
    });

    const progress = getProgress(todayUtc());
    expect(progress?.ss?.puzzleId).toBe("ss-999");
    expect(progress?.ss?.score).toBe(70);
  });
});

describe("empty bank", () => {
  it("returns default state when storage holds nothing", () => {
    const state = loadState();
    expect(state.schemaVersion).toBe(2);
    expect(state.daily).toEqual({});
    expect(state.stats.gamesPlayed).toBe(0);
    expect(state.streak.current).toBe(0);
  });
});

describe("score floor", () => {
  it("stores a score of 0 (the minimum) without corruption", () => {
    recordModeResult(todayUtc(), "timeline", {
      puzzleId: "tl-001",
      score: 0,
      revealedClues: 5,
      wrongGuesses: ["wrong order"],
      status: "given_up",
    });

    const progress = getProgress(todayUtc());
    expect(progress?.tl?.score).toBe(0);
    expect(progress?.tl?.status).toBe("given_up");
  });
});

describe("refresh recovery", () => {
  it("re-loads persisted progress after an in-memory reload", () => {
    // Simulate: user plays, data is saved, then the page reloads (a fresh
    // loadState call reads from the same adapter).
    recordModeResult(todayUtc(), "keywords", {
      puzzleId: "kw-001",
      score: 90,
      revealedClues: 2,
      wrongGuesses: ["hill"],
      status: "solved",
    });

    const reloaded = loadState();
    const progress = reloaded.daily[todayUtc()];
    expect(progress?.kw).toMatchObject({
      puzzleId: "kw-001",
      score: 90,
      status: "solved",
    });
  });
});

describe("reset", () => {
  it("clears all progress so a subsequent load returns defaults", () => {
    recordModeResult(todayUtc(), "keywords", {
      puzzleId: "kw-001",
      score: 90,
      revealedClues: 2,
      wrongGuesses: [],
      status: "solved",
    });
    resetState();
    const state = loadState();
    expect(state.daily).toEqual({});
    expect(state.stats.gamesPlayed).toBe(0);
  });
});
