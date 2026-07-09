import { describe, expect, it } from "vitest";

import { createDefaultState } from "./defaults";
import { CURRENT_SCHEMA_VERSION } from "./keys";
import { migrate } from "./migrate";
import { V2Schema } from "./types";
import type { PersistedState, PersistedStateV1 } from "./types";

/**
 * Migration unit tests.
 *
 * Covers V1→V2 upgrade, idempotency, missing-version handling, forward-
 * compatibility (version > CURRENT), and corrupted-input fallback.
 */

// --- V1 fixture ----------------------------------------------------------

function makeV1Fixture(): PersistedStateV1 {
  return {
    schemaVersion: 1,
    daily: {
      "2026-07-01": {
        kw: {
          puzzleId: "kw-001",
          score: 80,
          revealedClues: 3,
          wrongGuesses: ["volcano", "mountain"],
          status: "solved",
          updatedAt: "2026-07-01T10:00:00.000Z",
        },
      },
      "2026-07-02": {
        em: {
          puzzleId: "em-001",
          score: 60,
          revealedClues: 2,
          wrongGuesses: ["eruption"],
          status: "given_up",
          updatedAt: "2026-07-02T11:00:00.000Z",
        },
      },
    },
    streak: { current: 5, max: 10, lastActiveDate: "2026-07-02" },
    stats: {
      gamesPlayed: 5,
      bestDailyScore: 200,
      modeBreakdown: { keywords: 2, emoji: 1, screenshot: 1, timeline: 1 },
      modeAvgScore: { keywords: 70, emoji: 60, screenshot: 80, timeline: 75 },
      last30Days: { "2026-07-01": 200, "2026-07-02": 60 },
    },
    settings: {},
  };
}

// --- Tests ---------------------------------------------------------------

describe("migrate — V1 → V2", () => {
  it("upgrades V1 to V2 with all fields populated correctly", () => {
    const v1 = makeV1Fixture();
    const v2 = migrate(v1);

    expect(v2.schemaVersion).toBe(2);

    // daily/streak/stats preserved verbatim
    expect(v2.daily).toEqual(v1.daily);
    expect(v2.streak).toEqual(v1.streak);
    expect(v2.stats).toEqual(v1.stats);

    // settings upgraded to full defaults
    expect(v2.settings).toEqual({
      theme: "system",
      reducedMotion: false,
      soundEnabled: true,
    });

    // V2 additions initialized empty
    expect(v2.completedPuzzleIds).toEqual([]);
    expect(v2.recentPuzzleIds).toEqual([]);
    expect(v2.achievements).toEqual({ unlocked: [], updatedAt: null });
  });

  it("produces a state that passes V2Schema validation", () => {
    const v2 = migrate(makeV1Fixture());
    const result = V2Schema.safeParse(v2);
    expect(result.success).toBe(true);
  });

  it("does not lose daily/streak/stats data", () => {
    const v1 = makeV1Fixture();
    const v2 = migrate(v1);

    // Spot-check individual fields to guard against accidental shallow copies.
    expect(v2.daily["2026-07-01"]?.kw?.puzzleId).toBe("kw-001");
    expect(v2.daily["2026-07-02"]?.em?.score).toBe(60);
    expect(v2.streak.current).toBe(5);
    expect(v2.streak.max).toBe(10);
    expect(v2.stats.gamesPlayed).toBe(5);
    expect(v2.stats.modeBreakdown.keywords).toBe(2);
    expect(v2.stats.last30Days["2026-07-01"]).toBe(200);
  });
});

describe("migrate — idempotency", () => {
  it("migrating an already-V2 state is a deep-equal no-op", () => {
    const v2 = migrate(makeV1Fixture());
    const reMigrated = migrate(v2);
    expect(reMigrated).toEqual(v2);
    expect(reMigrated.schemaVersion).toBe(2);
  });

  it("migrating a fresh default state is a no-op", () => {
    const fresh = createDefaultState();
    const migrated = migrate(fresh);
    expect(migrated).toEqual(fresh);
  });
});

describe("migrate — missing schemaVersion", () => {
  it("treats an object without schemaVersion as V1", () => {
    const v1NoVersion = {
      daily: { "2026-07-01": {} },
      streak: { current: 1, max: 1, lastActiveDate: "2026-07-01" },
      stats: {
        gamesPlayed: 1,
        bestDailyScore: 0,
        modeBreakdown: { keywords: 0, emoji: 0, screenshot: 0, timeline: 0 },
        modeAvgScore: { keywords: 0, emoji: 0, screenshot: 0, timeline: 0 },
        last30Days: {},
      },
      settings: {},
    };
    const result = migrate(v1NoVersion);
    expect(result.schemaVersion).toBe(2);
    expect(result.streak.current).toBe(1);
    expect(result.settings.theme).toBe("system");
    expect(result.completedPuzzleIds).toEqual([]);
  });
});

describe("migrate — forward compatibility", () => {
  it("returns a default state when schemaVersion > CURRENT", () => {
    const future = {
      schemaVersion: CURRENT_SCHEMA_VERSION + 1,
      daily: {},
      streak: { current: 99, max: 99, lastActiveDate: "2099-01-01" },
      stats: {
        gamesPlayed: 99,
        bestDailyScore: 999,
        modeBreakdown: { keywords: 9, emoji: 9, screenshot: 9, timeline: 9 },
        modeAvgScore: { keywords: 99, emoji: 99, screenshot: 99, timeline: 99 },
        last30Days: {},
      },
      settings: { theme: "dark", reducedMotion: true, soundEnabled: false },
      completedPuzzleIds: ["kw-001"],
      recentPuzzleIds: ["kw-001"],
      achievements: { unlocked: ["first-win"], updatedAt: "2099-01-01T00:00:00.000Z" },
      unknownFutureField: { foo: "bar" },
    };
    const result = migrate(future);
    expect(result).toEqual(createDefaultState());
    // The unknown future state must NOT leak into the returned default.
    expect(result.streak.current).toBe(0);
    expect(result.completedPuzzleIds).toEqual([]);
  });
});

describe("migrate — corrupted input", () => {
  it("returns a default state for null", () => {
    expect(migrate(null)).toEqual(createDefaultState());
  });

  it("returns a default state for an array", () => {
    expect(migrate([1, 2, 3])).toEqual(createDefaultState());
  });

  it("returns a default state for a string", () => {
    expect(migrate("not an object")).toEqual(createDefaultState());
  });

  it("returns a default state for a number", () => {
    expect(migrate(42)).toEqual(createDefaultState());
  });

  it("returns a default state for undefined", () => {
    expect(migrate(undefined)).toEqual(createDefaultState());
  });

  it("returns a default state for a V2-shaped object that fails validation", () => {
    // schemaVersion is 2 but streak is malformed (missing max).
    const malformed = {
      schemaVersion: 2,
      daily: {},
      streak: { current: 1 }, // missing max + lastActiveDate
      stats: {
        gamesPlayed: 0,
        bestDailyScore: 0,
        modeBreakdown: { keywords: 0, emoji: 0, screenshot: 0, timeline: 0 },
        modeAvgScore: { keywords: 0, emoji: 0, screenshot: 0, timeline: 0 },
        last30Days: {},
      },
      settings: { theme: "system", reducedMotion: false, soundEnabled: true },
      completedPuzzleIds: [],
      recentPuzzleIds: [],
      achievements: { unlocked: [], updatedAt: null },
    };
    expect(migrate(malformed)).toEqual(createDefaultState());
  });
});

describe("migrate — partial V1 data", () => {
  it("preserves only the fields that exist; fills the rest with defaults", () => {
    // A V1 object missing streak and stats entirely.
    const partial = {
      schemaVersion: 1,
      daily: {},
      settings: {},
    };
    const result = migrate(partial);
    expect(result.schemaVersion).toBe(2);
    expect(result.streak).toEqual({ current: 0, max: 0, lastActiveDate: null });
    expect(result.stats.gamesPlayed).toBe(0);
    expect(result.daily).toEqual({});
  });
});

// Compile-time guard: the V1 fixture type is assignable to PersistedStateV1.
// This ensures the fixture stays in sync with the V1 shape definition.
const _typeCheck: PersistedStateV1 = makeV1Fixture();
void _typeCheck;

// Compile-time guard: migrate always returns the current PersistedState.
const _typeCheck2: PersistedState = migrate(makeV1Fixture());
void _typeCheck2;
