import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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
import { daysAgo, todayUtc } from "./__testutils__/helpers";

/**
 * Domain-action unit tests. Every test starts with a fresh memory adapter
 * so there is no cross-test state leakage.
 */

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

describe("recordModeResult — given_up is terminal (P1-6)", () => {
  it("does NOT overwrite a given_up record with a later solved attempt for the same day+mode", () => {
    const today = todayUtc();
    recordModeResult(today, "keywords", {
      puzzleId: "kw-001",
      score: 0,
      revealedClues: 6,
      wrongGuesses: ["x"],
      status: "given_up",
    });

    const second = recordModeResult(today, "keywords", {
      puzzleId: "kw-001",
      score: 100,
      revealedClues: 0,
      wrongGuesses: [],
      status: "solved",
    });

    // Per PRD §5.1 the result is locked once given_up; a later solve is rejected.
    expect(second.changed).toBe(false);
    expect(second.state.daily[today]?.kw?.status).toBe("given_up");
    expect(second.state.daily[today]?.kw?.score).toBe(0);
  });
});

describe("recordModeResult — defensive normalization (P1-1)", () => {
  it("clamps an out-of-range score into [0, 100] before persisting", () => {
    const today = todayUtc();
    recordModeResult(today, "keywords", {
      puzzleId: "kw-001",
      score: 250, // over max
      revealedClues: 2,
      wrongGuesses: [],
      status: "solved",
    });
    const loaded = loadState();
    expect(loaded.daily[today]?.kw?.score).toBe(100);
  });

  it("clamps a negative score to 0", () => {
    const today = todayUtc();
    recordModeResult(today, "keywords", {
      puzzleId: "kw-001",
      score: -50,
      revealedClues: -3, // also negative
      wrongGuesses: [],
      status: "solved",
    });
    const loaded = loadState();
    expect(loaded.daily[today]?.kw?.score).toBe(0);
    expect(loaded.daily[today]?.kw?.revealedClues).toBe(0);
  });

  it("normalizes wrongGuesses case so case variants do not store as duplicates (P2-4)", () => {
    const today = todayUtc();
    recordModeResult(today, "keywords", {
      puzzleId: "kw-001",
      score: 80,
      revealedClues: 1,
      wrongGuesses: ["Volcano", "VOLCANO", "volcano", "  Mountain  "],
      status: "solved",
    });
    const loaded = loadState();
    expect(loaded.daily[today]?.kw?.wrongGuesses).toEqual(["volcano", "mountain"]);
  });
});

describe("recordModeResult — modeAvgScore value (P2-26)", () => {
  it("computes the mean of solved scores for a mode across days, exactly", () => {
    const dayA = daysAgo(1);
    const dayB = todayUtc();
    recordModeResult(dayA, "keywords", {
      puzzleId: "kw-001",
      score: 80,
      revealedClues: 1,
      wrongGuesses: [],
      status: "solved",
    });
    recordModeResult(dayB, "keywords", {
      puzzleId: "kw-002",
      score: 60,
      revealedClues: 1,
      wrongGuesses: [],
      status: "solved",
    });

    const loaded = loadState();
    // Two solved attempts (80, 60) → mean 70. Assert the exact value, not just
    // that the field exists (the previous blind spot).
    expect(loaded.stats.modeAvgScore.keywords).toBe(70);
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

// --- recordModeResult — streak recalculation (slice 4d-8) -----------------

describe("recordModeResult — streak update", () => {
  it("starts a streak from 1 on the first completed puzzle (PRD §7.3)", () => {
    const today = todayUtc();
    recordModeResult(today, "keywords", {
      puzzleId: "kw-001",
      score: 80,
      revealedClues: 1,
      wrongGuesses: [],
      status: "solved",
    });
    const loaded = loadState();
    expect(loaded.streak.current).toBe(1);
    expect(loaded.streak.max).toBe(1);
    expect(loaded.streak.lastActiveDate).toBe(today);
  });

  it("is idempotent for same-day completions (streak stays 1)", () => {
    const today = todayUtc();
    recordModeResult(today, "keywords", {
      puzzleId: "kw-001",
      score: 80,
      revealedClues: 1,
      wrongGuesses: [],
      status: "solved",
    });
    // Second mode, same day — streak should NOT bump to 2.
    recordModeResult(today, "emoji", {
      puzzleId: "em-001",
      score: 70,
      revealedClues: 1,
      wrongGuesses: [],
      status: "solved",
    });
    const loaded = loadState();
    expect(loaded.streak.current).toBe(1);
    expect(loaded.streak.lastActiveDate).toBe(today);
  });

  it("increments the streak when the previous activity was yesterday", () => {
    const yesterday = daysAgo(1);
    const today = todayUtc();
    // Seed yesterday's activity.
    recordModeResult(yesterday, "keywords", {
      puzzleId: "kw-001",
      score: 80,
      revealedClues: 1,
      wrongGuesses: [],
      status: "solved",
    });
    expect(loadState().streak.current).toBe(1);

    // Today's completion → streak 2.
    recordModeResult(today, "emoji", {
      puzzleId: "em-001",
      score: 70,
      revealedClues: 1,
      wrongGuesses: [],
      status: "solved",
    });
    const loaded = loadState();
    expect(loaded.streak.current).toBe(2);
    expect(loaded.streak.max).toBe(2);
    expect(loaded.streak.lastActiveDate).toBe(today);
  });

  it("resets the streak to 1 when a day was skipped", () => {
    const twoDaysAgo = daysAgo(2);
    const today = todayUtc();
    recordModeResult(twoDaysAgo, "keywords", {
      puzzleId: "kw-001",
      score: 80,
      revealedClues: 1,
      wrongGuesses: [],
      status: "solved",
    });
    expect(loadState().streak.current).toBe(1);

    // Skip yesterday; complete today → broken streak, reset to 1.
    recordModeResult(today, "emoji", {
      puzzleId: "em-001",
      score: 70,
      revealedClues: 1,
      wrongGuesses: [],
      status: "solved",
    });
    const loaded = loadState();
    expect(loaded.streak.current).toBe(1);
    expect(loaded.streak.max).toBe(1); // max also resets since the old streak is gone
    expect(loaded.streak.lastActiveDate).toBe(today);
  });

  it("does NOT update the streak for an in_progress record", () => {
    const today = todayUtc();
    recordModeResult(today, "keywords", {
      puzzleId: "kw-001",
      score: 0,
      revealedClues: 1,
      wrongGuesses: [],
      status: "in_progress",
    });
    const loaded = loadState();
    expect(loaded.streak.current).toBe(0);
    expect(loaded.streak.lastActiveDate).toBeNull();
  });

  it("does NOT bump the streak on a duplicate (idempotent no-op) result", () => {
    const today = todayUtc();
    const payload = {
      puzzleId: "kw-001",
      score: 80,
      revealedClues: 1,
      wrongGuesses: [],
      status: "solved" as const,
    };
    recordModeResult(today, "keywords", payload);
    // Identical repeat → changed:false, no new streak side effect.
    const second = recordModeResult(today, "keywords", payload);
    expect(second.changed).toBe(false);
    expect(loadState().streak.current).toBe(1);
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

  it("re-stamps when called again in a later minute (P2-31)", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-16T10:00:30.000Z"));
    const today = todayUtc();
    const first = completeDailyChallenge(today);
    expect(first.changed).toBe(true);
    const firstStamp = loadState().daily[today]?.completedAt;

    // Same minute — still idempotent.
    vi.setSystemTime(new Date("2026-07-16T10:00:59.000Z"));
    const sameMinute = completeDailyChallenge(today);
    expect(sameMinute.changed).toBe(false);

    // Next minute — the day is re-sealed with a fresh timestamp.
    vi.setSystemTime(new Date("2026-07-16T10:01:05.000Z"));
    const later = completeDailyChallenge(today);
    expect(later.changed).toBe(true);
    const laterStamp = loadState().daily[today]?.completedAt;
    expect(laterStamp).not.toBe(firstStamp);

    vi.useRealTimers();
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
