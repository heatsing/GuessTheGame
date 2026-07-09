import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { __setAdapterForTesting, createMemoryAdapter } from "./adapter";
import {
  completeDailyChallenge,
  getAchievements,
  getCompletedPuzzleIds,
  getProgress,
  getRecentPuzzleIds,
  getSettings,
  getStats,
  getStreak,
  recordModeResult,
  recalcStreak,
  unlockAchievement,
  updateSettings,
} from "./actions";
import { exportState, loadState, resetState } from "./client";
import { createDefaultState } from "./defaults";

/**
 * End-to-end integration tests for the storage layer.
 *
 * Exercises the full loadState → actions → saveState → loadState cycle to
 * verify data round-trips correctly across a simulated session boundary.
 */

// --- Date helpers --------------------------------------------------------

function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

// --- Setup ---------------------------------------------------------------

beforeEach(() => {
  __setAdapterForTesting(createMemoryAdapter());
});

afterEach(() => {
  __setAdapterForTesting(null);
});

// --- Tests ---------------------------------------------------------------

describe("integration — full daily session", () => {
  it("records 4 modes, completes the day, recalcs streak, unlocks achievement, and reloads", () => {
    const today = todayUtc();

    // (1) Fresh load → default state.
    expect(loadState()).toEqual(createDefaultState());

    // (2) Record all four modes.
    recordModeResult(today, "keywords", {
      puzzleId: "kw-001",
      score: 90,
      revealedClues: 2,
      wrongGuesses: ["volcano"],
      status: "solved",
    });
    recordModeResult(today, "emoji", {
      puzzleId: "em-001",
      score: 80,
      revealedClues: 2,
      wrongGuesses: ["volcano"],
      status: "solved",
    });
    recordModeResult(today, "screenshot", {
      puzzleId: "ss-001",
      score: 70,
      revealedClues: 1,
      wrongGuesses: ["volcano"],
      status: "solved",
    });
    recordModeResult(today, "timeline", {
      puzzleId: "tl-001",
      score: 60,
      revealedClues: 0,
      wrongGuesses: [],
      status: "given_up",
    });

    // (3) Complete the daily challenge.
    expect(completeDailyChallenge(today).changed).toBe(true);

    // (4) Recalculate the streak (first-ever activity → 1).
    expect(recalcStreak(today).changed).toBe(true);

    // (5) Unlock an achievement.
    expect(unlockAchievement("daily-complete").changed).toBe(true);

    // (6) Reload — verify everything persisted.
    const reloaded = loadState();

    // Daily progress for all 4 modes.
    const day = reloaded.daily[today];
    expect(day).toBeDefined();
    expect(day?.kw?.puzzleId).toBe("kw-001");
    expect(day?.kw?.score).toBe(90);
    expect(day?.em?.puzzleId).toBe("em-001");
    expect(day?.em?.score).toBe(80);
    expect(day?.ss?.puzzleId).toBe("ss-001");
    expect(day?.ss?.score).toBe(70);
    expect(day?.tl?.puzzleId).toBe("tl-001");
    expect(day?.tl?.score).toBe(60);
    expect(day?.tl?.status).toBe("given_up");
    expect(day?.completedAt).not.toBeUndefined();

    // Streak.
    expect(reloaded.streak.current).toBe(1);
    expect(reloaded.streak.max).toBe(1);
    expect(reloaded.streak.lastActiveDate).toBe(today);

    // Stats: all 4 modes counted, day total = 90+80+70+60 = 300.
    expect(reloaded.stats.modeBreakdown.keywords).toBe(1);
    expect(reloaded.stats.modeBreakdown.emoji).toBe(1);
    expect(reloaded.stats.modeBreakdown.screenshot).toBe(1);
    expect(reloaded.stats.modeBreakdown.timeline).toBe(1);
    expect(reloaded.stats.bestDailyScore).toBe(300);
    expect(reloaded.stats.last30Days[today]).toBe(300);
    // gamesPlayed: 4 completions (3 solved + 1 given_up), each a first completion.
    expect(reloaded.stats.gamesPlayed).toBe(4);

    // Recent puzzle IDs (most-recent-first: tl was last recorded).
    expect(reloaded.recentPuzzleIds).toEqual([
      "tl-001",
      "ss-001",
      "em-001",
      "kw-001",
    ]);

    // Completed puzzle IDs (all 4 are solved/given_up).
    expect(reloaded.completedPuzzleIds).toEqual([
      "kw-001",
      "em-001",
      "ss-001",
      "tl-001",
    ]);

    // Achievements.
    expect(reloaded.achievements.unlocked).toEqual(["daily-complete"]);
    expect(reloaded.achievements.updatedAt).not.toBeNull();

    // Settings unchanged (defaults).
    expect(reloaded.settings).toEqual({
      theme: "system",
      reducedMotion: false,
      soundEnabled: true,
    });

    // (7) Getter API returns the same data as loadState.
    const progress = getProgress(today);
    expect(progress?.kw?.score).toBe(90);
    expect(getStats().bestDailyScore).toBe(300);
    expect(getStreak().current).toBe(1);
    expect(getSettings().theme).toBe("system");
    expect(getAchievements().unlocked).toEqual(["daily-complete"]);
    expect(getCompletedPuzzleIds()).toHaveLength(4);
    expect(getRecentPuzzleIds()[0]).toBe("tl-001");
  });
});

describe("integration — cross-session persistence", () => {
  it("data written in one session survives a reload", () => {
    const today = todayUtc();

    // Session 1: write data.
    recordModeResult(today, "keywords", {
      puzzleId: "kw-001",
      score: 85,
      revealedClues: 1,
      wrongGuesses: ["volcano"],
      status: "solved",
    });
    unlockAchievement("first-win");
    updateSettings({ theme: "dark" });

    // Session 2: "reload" — the memory adapter retains the data.
    const reloaded = loadState();
    expect(reloaded.daily[today]?.kw?.score).toBe(85);
    expect(reloaded.achievements.unlocked).toEqual(["first-win"]);
    expect(reloaded.settings.theme).toBe("dark");
  });
});

describe("integration — export → reset → reload", () => {
  it("exportState returns parseable JSON; resetState clears storage", () => {
    const today = todayUtc();
    recordModeResult(today, "keywords", {
      puzzleId: "kw-001",
      score: 100,
      revealedClues: 0,
      wrongGuesses: [],
      status: "solved",
    });

    // Export → must be parseable JSON containing the recorded data.
    const exported = exportState();
    expect(exported.length).toBeGreaterThan(0);
    const parsed = JSON.parse(exported);
    expect(parsed.daily[today].kw.puzzleId).toBe("kw-001");
    expect(parsed.schemaVersion).toBe(2);

    // Reset → storage is empty.
    resetState();
    expect(loadState()).toEqual(createDefaultState());
  });
});
