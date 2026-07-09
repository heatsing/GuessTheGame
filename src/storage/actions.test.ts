import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { __setAdapterForTesting, createMemoryAdapter } from "./adapter";
import {
  addCompletedPuzzle,
  addRecentPuzzle,
  completeDailyChallenge,
  getProgress,
  recordModeResult,
  recalcStreak,
  unlockAchievement,
  updateSettings,
} from "./actions";
import { loadState, saveState } from "./client";
import { createDefaultState } from "./defaults";
import { RECENT_PUZZLES_CAP } from "./keys";
import type { PersistedState } from "./types";

/**
 * Domain-action unit tests. Every test starts with a fresh memory adapter
 * so there is no cross-test state leakage.
 */

// --- Date helpers --------------------------------------------------------

function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

function daysAgo(n: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().slice(0, 10);
}

// --- Setup ---------------------------------------------------------------

beforeEach(() => {
  __setAdapterForTesting(createMemoryAdapter());
});

afterEach(() => {
  __setAdapterForTesting(null);
});

// --- recordModeResult ----------------------------------------------------

describe("recordModeResult — first record", () => {
  it("records a new mode result and persists it", () => {
    const today = todayUtc();
    const result = recordModeResult(today, "keywords", {
      puzzleId: "kw-001",
      score: 80,
      revealedClues: 2,
      wrongGuesses: ["volcano", "mountain"],
      status: "solved",
    });

    expect(result.changed).toBe(true);
    expect(result.state.daily[today]?.kw?.score).toBe(80);
    expect(result.state.daily[today]?.kw?.puzzleId).toBe("kw-001");

    // Persisted to storage.
    const loaded = loadState();
    expect(loaded.daily[today]?.kw?.score).toBe(80);
  });

  it("de-duplicates wrongGuesses on write", () => {
    const today = todayUtc();
    recordModeResult(today, "keywords", {
      puzzleId: "kw-001",
      score: 80,
      revealedClues: 2,
      wrongGuesses: ["volcano", "volcano", "mountain", "volcano"],
      status: "solved",
    });

    const loaded = loadState();
    expect(loaded.daily[today]?.kw?.wrongGuesses).toEqual([
      "volcano",
      "mountain",
    ]);
  });
});

describe("recordModeResult — idempotency", () => {
  it("returns changed:false for an identical repeat result", () => {
    const today = todayUtc();
    const payload = {
      puzzleId: "kw-001",
      score: 80,
      revealedClues: 2,
      wrongGuesses: ["volcano"],
      status: "solved" as const,
    };

    const first = recordModeResult(today, "keywords", payload);
    expect(first.changed).toBe(true);

    const second = recordModeResult(today, "keywords", payload);
    expect(second.changed).toBe(false);
  });
});

describe("recordModeResult — higher score wins", () => {
  it("updates to a higher solved score", () => {
    const today = todayUtc();
    recordModeResult(today, "keywords", {
      puzzleId: "kw-001",
      score: 70,
      revealedClues: 2,
      wrongGuesses: [],
      status: "solved",
    });
    const second = recordModeResult(today, "keywords", {
      puzzleId: "kw-001",
      score: 90,
      revealedClues: 1,
      wrongGuesses: [],
      status: "solved",
    });

    expect(second.changed).toBe(true);
    expect(second.state.daily[today]?.kw?.score).toBe(90);
  });

  it("keeps the existing score when the new solved score is not higher", () => {
    const today = todayUtc();
    recordModeResult(today, "keywords", {
      puzzleId: "kw-001",
      score: 90,
      revealedClues: 1,
      wrongGuesses: [],
      status: "solved",
    });
    const second = recordModeResult(today, "keywords", {
      puzzleId: "kw-001",
      score: 70,
      revealedClues: 2,
      wrongGuesses: [],
      status: "solved",
    });

    expect(second.changed).toBe(false);
    expect(second.state.daily[today]?.kw?.score).toBe(90);
  });
});

describe("recordModeResult — no downgrade from solved to given_up", () => {
  it("keeps the old solved record when the new attempt is given_up", () => {
    const today = todayUtc();
    recordModeResult(today, "keywords", {
      puzzleId: "kw-001",
      score: 80,
      revealedClues: 2,
      wrongGuesses: [],
      status: "solved",
    });
    const second = recordModeResult(today, "keywords", {
      puzzleId: "kw-001",
      score: 0,
      revealedClues: 5,
      wrongGuesses: ["wrong"],
      status: "given_up",
    });

    expect(second.changed).toBe(false);
    expect(second.state.daily[today]?.kw?.status).toBe("solved");
    expect(second.state.daily[today]?.kw?.score).toBe(80);
  });
});

describe("recordModeResult — recent + completed puzzle lists", () => {
  it("prepends puzzleId to recentPuzzleIds (deduped, capped)", () => {
    const today = todayUtc();
    recordModeResult(today, "keywords", {
      puzzleId: "kw-001",
      score: 80,
      revealedClues: 1,
      wrongGuesses: [],
      status: "solved",
    });
    recordModeResult(today, "emoji", {
      puzzleId: "em-001",
      score: 70,
      revealedClues: 1,
      wrongGuesses: [],
      status: "solved",
    });

    const loaded = loadState();
    // em-001 was recorded last → at the front.
    expect(loaded.recentPuzzleIds).toEqual(["em-001", "kw-001"]);

    // Re-recording kw-001 moves it back to the front (deduped, not appended).
    recordModeResult(today, "keywords", {
      puzzleId: "kw-001",
      score: 85,
      revealedClues: 1,
      wrongGuesses: [],
      status: "solved",
    });
    const loaded2 = loadState();
    expect(loaded2.recentPuzzleIds).toEqual(["kw-001", "em-001"]);
    expect(loaded2.recentPuzzleIds).toHaveLength(2);
  });

  it("caps recentPuzzleIds at RECENT_PUZZLES_CAP", () => {
    // Record 25 distinct puzzles across different days. Each call prepends,
    // so the last recorded (kw-025) ends up at the front.
    for (let i = 0; i < 25; i++) {
      recordModeResult(daysAgo(i), "keywords", {
        puzzleId: `kw-${String(i + 1).padStart(3, "0")}`,
        score: 50,
        revealedClues: 1,
        wrongGuesses: [],
        status: "solved",
      });
    }
    const loaded = loadState();
    expect(loaded.recentPuzzleIds.length).toBeLessThanOrEqual(
      RECENT_PUZZLES_CAP,
    );
    expect(loaded.recentPuzzleIds).toHaveLength(RECENT_PUZZLES_CAP);
    // Most-recently-recorded (kw-025) at the front; kw-001..kw-005 dropped.
    expect(loaded.recentPuzzleIds[0]).toBe("kw-025");
    expect(loaded.recentPuzzleIds[19]).toBe("kw-006");
    expect(loaded.recentPuzzleIds).not.toContain("kw-001");
  });

  it("adds puzzleId to completedPuzzleIds only on solved/given_up (deduped)", () => {
    const today = todayUtc();
    recordModeResult(today, "keywords", {
      puzzleId: "kw-001",
      score: 80,
      revealedClues: 1,
      wrongGuesses: [],
      status: "solved",
    });
    // Same puzzle, different day, also solved → should not duplicate.
    recordModeResult(daysAgo(1), "keywords", {
      puzzleId: "kw-001",
      score: 70,
      revealedClues: 1,
      wrongGuesses: [],
      status: "solved",
    });

    const loaded = loadState();
    expect(loaded.completedPuzzleIds).toEqual(["kw-001"]);
  });

  it("does not add to completedPuzzleIds for in_progress status", () => {
    const today = todayUtc();
    recordModeResult(today, "keywords", {
      puzzleId: "kw-001",
      score: 0,
      revealedClues: 1,
      wrongGuesses: [],
      status: "in_progress",
    });
    const loaded = loadState();
    expect(loaded.completedPuzzleIds).not.toContain("kw-001");
  });
});

// --- addCompletedPuzzle --------------------------------------------------

describe("addCompletedPuzzle", () => {
  it("adds a new puzzle id", () => {
    const result = addCompletedPuzzle("kw-001");
    expect(result.changed).toBe(true);
    expect(loadState().completedPuzzleIds).toEqual(["kw-001"]);
  });

  it("is idempotent (no-op for an existing id)", () => {
    addCompletedPuzzle("kw-001");
    const result = addCompletedPuzzle("kw-001");
    expect(result.changed).toBe(false);
    expect(loadState().completedPuzzleIds).toEqual(["kw-001"]);
  });
});

// --- addRecentPuzzle -----------------------------------------------------

describe("addRecentPuzzle", () => {
  it("prepends and de-duplicates", () => {
    addRecentPuzzle("kw-001");
    addRecentPuzzle("kw-002");
    expect(loadState().recentPuzzleIds).toEqual(["kw-002", "kw-001"]);

    // Re-adding kw-001 moves it to the front.
    addRecentPuzzle("kw-001");
    expect(loadState().recentPuzzleIds).toEqual(["kw-001", "kw-002"]);
  });

  it("truncates to RECENT_PUZZLES_CAP", () => {
    for (let i = 0; i < 30; i++) {
      addRecentPuzzle(`kw-${String(i + 1).padStart(3, "0")}`);
    }
    const loaded = loadState();
    expect(loaded.recentPuzzleIds).toHaveLength(RECENT_PUZZLES_CAP);
    // Most recent (kw-030) at the front.
    expect(loaded.recentPuzzleIds[0]).toBe("kw-030");
  });

  it("is a no-op when the id is already at the front", () => {
    addRecentPuzzle("kw-001");
    addRecentPuzzle("kw-002");
    const result = addRecentPuzzle("kw-002");
    expect(result.changed).toBe(false);
  });
});

// --- unlockAchievement ---------------------------------------------------

describe("unlockAchievement", () => {
  it("unlocks a new achievement and sets updatedAt", () => {
    const result = unlockAchievement("first-win");
    expect(result.changed).toBe(true);
    const loaded = loadState();
    expect(loaded.achievements.unlocked).toEqual(["first-win"]);
    expect(loaded.achievements.updatedAt).not.toBeNull();
  });

  it("is idempotent (no-op for an already-unlocked achievement)", () => {
    unlockAchievement("first-win");
    const result = unlockAchievement("first-win");
    expect(result.changed).toBe(false);
    expect(loadState().achievements.unlocked).toEqual(["first-win"]);
  });
});

// --- updateSettings ------------------------------------------------------

describe("updateSettings", () => {
  it("merges a partial settings update", () => {
    const result = updateSettings({ theme: "dark" });
    expect(result.changed).toBe(true);
    const loaded = loadState();
    expect(loaded.settings.theme).toBe("dark");
    // Unchanged fields preserved.
    expect(loaded.settings.reducedMotion).toBe(false);
    expect(loaded.settings.soundEnabled).toBe(true);
  });

  it("is a no-op when the value is unchanged", () => {
    // Default theme is "system".
    const result = updateSettings({ theme: "system" });
    expect(result.changed).toBe(false);
  });

  it("can update multiple fields at once", () => {
    updateSettings({ reducedMotion: true, soundEnabled: false });
    const loaded = loadState();
    expect(loaded.settings.reducedMotion).toBe(true);
    expect(loaded.settings.soundEnabled).toBe(false);
  });
});

// --- completeDailyChallenge ---------------------------------------------

describe("completeDailyChallenge", () => {
  it("stamps completedAt on the day entry", () => {
    const today = todayUtc();
    const result = completeDailyChallenge(today);
    expect(result.changed).toBe(true);

    const loaded = loadState();
    expect(loaded.daily[today]?.completedAt).not.toBeUndefined();
  });

  it("is idempotent within the same minute", () => {
    const today = todayUtc();
    completeDailyChallenge(today);
    const second = completeDailyChallenge(today);
    expect(second.changed).toBe(false);
  });
});

// --- recalcStreak --------------------------------------------------------

describe("recalcStreak", () => {
  function seedStreak(
    current: number,
    max: number,
    lastActiveDate: string | null,
  ): void {
    const state: PersistedState = createDefaultState();
    state.streak = { current, max, lastActiveDate };
    saveState(state);
  }

  it("increments when lastActiveDate is yesterday", () => {
    const today = todayUtc();
    const yesterday = daysAgo(1);
    seedStreak(3, 5, yesterday);

    const result = recalcStreak(today);
    expect(result.changed).toBe(true);

    const loaded = loadState();
    expect(loaded.streak.current).toBe(4);
    expect(loaded.streak.max).toBe(5);
    expect(loaded.streak.lastActiveDate).toBe(today);
  });

  it("updates max when the new current exceeds it", () => {
    const today = todayUtc();
    const yesterday = daysAgo(1);
    seedStreak(5, 5, yesterday);

    recalcStreak(today);
    const loaded = loadState();
    expect(loaded.streak.current).toBe(6);
    expect(loaded.streak.max).toBe(6);
  });

  it("is a no-op when lastActiveDate is already today", () => {
    const today = todayUtc();
    seedStreak(3, 5, today);

    const result = recalcStreak(today);
    expect(result.changed).toBe(false);

    const loaded = loadState();
    expect(loaded.streak.current).toBe(3);
  });

  it("resets to 1 when the streak is broken", () => {
    const today = todayUtc();
    const longAgo = daysAgo(10);
    seedStreak(5, 7, longAgo);

    const result = recalcStreak(today);
    expect(result.changed).toBe(true);

    const loaded = loadState();
    expect(loaded.streak.current).toBe(1);
    expect(loaded.streak.max).toBe(7);
    expect(loaded.streak.lastActiveDate).toBe(today);
  });

  it("starts a streak from 1 on first-ever activity", () => {
    const today = todayUtc();
    seedStreak(0, 0, null);

    const result = recalcStreak(today);
    expect(result.changed).toBe(true);

    const loaded = loadState();
    expect(loaded.streak.current).toBe(1);
    expect(loaded.streak.max).toBe(1);
    expect(loaded.streak.lastActiveDate).toBe(today);
  });
});

// --- getProgress ---------------------------------------------------------

describe("getProgress", () => {
  it("returns undefined for a day with no progress", () => {
    expect(getProgress("2020-01-01")).toBeUndefined();
  });

  it("returns the day's progress after a record", () => {
    const today = todayUtc();
    recordModeResult(today, "keywords", {
      puzzleId: "kw-001",
      score: 80,
      revealedClues: 1,
      wrongGuesses: [],
      status: "solved",
    });
    const progress = getProgress(today);
    expect(progress?.kw?.puzzleId).toBe("kw-001");
  });
});
