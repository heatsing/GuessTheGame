import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { __setAdapterForTesting, createMemoryAdapter, type StorageAdapter } from "./adapter";
import { createDefaultState } from "./defaults";
import {
  estimateSize,
  exportState,
  isStorageAvailable,
  loadState,
  resetState,
  saveState,
} from "./client";
import { CURRENT_SCHEMA_VERSION, STORAGE_KEY } from "./keys";
import type { PersistedState, PersistedStateV1 } from "./types";

/**
 * Client (low-level read/write) unit tests.
 *
 * Uses a fresh memory adapter per test via __setAdapterForTesting so tests
 * are isolated and never touch real localStorage.
 */

// --- Date helpers (mirror the production UTC math) ----------------------

function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

function daysAgo(n: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().slice(0, 10);
}

// --- Shared fixtures -----------------------------------------------------

function makeV1Fixture(): PersistedStateV1 {
  return {
    schemaVersion: 1,
    daily: {
      "2026-07-01": {
        kw: {
          puzzleId: "kw-001",
          score: 80,
          revealedClues: 3,
          wrongGuesses: ["volcano"],
          status: "solved",
          updatedAt: "2026-07-01T10:00:00.000Z",
        },
      },
    },
    streak: { current: 5, max: 10, lastActiveDate: "2026-07-01" },
    stats: {
      gamesPlayed: 5,
      bestDailyScore: 200,
      modeBreakdown: { keywords: 2, emoji: 1, screenshot: 1, timeline: 1 },
      modeAvgScore: { keywords: 70, emoji: 60, screenshot: 80, timeline: 75 },
      last30Days: { "2026-07-01": 200 },
    },
    settings: {},
  };
}

// --- Setup ---------------------------------------------------------------

beforeEach(() => {
  __setAdapterForTesting(createMemoryAdapter());
});

afterEach(() => {
  __setAdapterForTesting(null);
});

// --- Tests ---------------------------------------------------------------

describe("loadState", () => {
  it("returns a default state when storage is empty", () => {
    const state = loadState();
    expect(state).toEqual(createDefaultState());
  });

  it("returns a default state when JSON is corrupted (no throw)", () => {
    const adapter = createMemoryAdapter();
    __setAdapterForTesting(adapter);
    adapter.setItem(STORAGE_KEY, "{ not valid json");

    const state = loadState();
    expect(state).toEqual(createDefaultState());

    // The corrupted raw should be stashed under :corrupted for recovery.
    expect(adapter.getItem(STORAGE_KEY + ":corrupted")).toBe(
      "{ not valid json",
    );
    // The primary key must NOT have been overwritten.
    expect(adapter.getItem(STORAGE_KEY)).toBe("{ not valid json");
  });

  it("migrates V1 data to V2 on load", () => {
    const adapter = createMemoryAdapter();
    __setAdapterForTesting(adapter);
    adapter.setItem(STORAGE_KEY, JSON.stringify(makeV1Fixture()));

    const state = loadState();
    expect(state.schemaVersion).toBe(2);
    expect(state.daily["2026-07-01"]?.kw?.puzzleId).toBe("kw-001");
    expect(state.settings.theme).toBe("system");
    expect(state.completedPuzzleIds).toEqual([]);
    expect(state.achievements.unlocked).toEqual([]);
  });
});

describe("saveState + loadState round-trip", () => {
  it("writes a state and reads it back", () => {
    const today = todayUtc();
    const state = createDefaultState();
    state.daily[today] = {
      kw: {
        puzzleId: "kw-001",
        score: 90,
        revealedClues: 2,
        wrongGuesses: ["mountain"],
        status: "solved",
        updatedAt: "2026-07-09T10:00:00.000Z",
      },
    };

    const result = saveState(state);
    expect(result.ok).toBe(true);

    const loaded = loadState();
    expect(loaded.daily[today]?.kw?.puzzleId).toBe("kw-001");
    expect(loaded.daily[today]?.kw?.score).toBe(90);
  });
});

describe("saveState — pruning", () => {
  it("removes daily entries older than DAILY_RETENTION_DAYS", () => {
    const state = createDefaultState();
    const recent = daysAgo(1);
    const old = daysAgo(90); // well beyond 60 days

    state.daily[recent] = {
      kw: {
        puzzleId: "kw-001",
        score: 80,
        revealedClues: 1,
        wrongGuesses: [],
        status: "solved",
        updatedAt: "2026-07-09T10:00:00.000Z",
      },
    };
    state.daily[old] = {
      kw: {
        puzzleId: "kw-002",
        score: 50,
        revealedClues: 1,
        wrongGuesses: [],
        status: "given_up",
        updatedAt: "2026-04-01T10:00:00.000Z",
      },
    };

    saveState(state);
    const loaded = loadState();

    expect(loaded.daily[recent]).toBeDefined();
    expect(loaded.daily[old]).toBeUndefined();
  });

  it("removes last30Days entries older than LAST30_RETENTION", () => {
    const state = createDefaultState();
    const recent = daysAgo(1);
    const old = daysAgo(45); // beyond 30 days

    state.stats.last30Days[recent] = 100;
    state.stats.last30Days[old] = 50;

    saveState(state);
    const loaded = loadState();

    expect(loaded.stats.last30Days[recent]).toBe(100);
    expect(loaded.stats.last30Days[old]).toBeUndefined();
  });

  it("truncates recentPuzzleIds to RECENT_PUZZLES_CAP (20)", () => {
    const state = createDefaultState();
    state.recentPuzzleIds = Array.from({ length: 30 }, (_, i) => `kw-${String(i + 1).padStart(3, "0")}`);

    saveState(state);
    const loaded = loadState();

    expect(loaded.recentPuzzleIds).toHaveLength(20);
    // Most-recent-first: the first 20 of the input are kept.
    expect(loaded.recentPuzzleIds[0]).toBe("kw-001");
    expect(loaded.recentPuzzleIds[19]).toBe("kw-020");
  });

  it("de-duplicates completedPuzzleIds", () => {
    const state = createDefaultState();
    state.completedPuzzleIds = ["kw-001", "kw-001", "em-001", "kw-001", "ss-001"];

    saveState(state);
    const loaded = loadState();

    expect(loaded.completedPuzzleIds).toEqual(["kw-001", "em-001", "ss-001"]);
  });
});

describe("saveState — quota exceeded", () => {
  it("returns { ok: false, error: 'quota' } when setItem throws QuotaExceededError", () => {
    const throwing: StorageAdapter = {
      getItem: () => null,
      setItem: () => {
        throw new DOMException("QuotaExceededError", "QuotaExceededError");
      },
      removeItem: () => {
        // no-op
      },
      isAvailable: () => true,
    };
    __setAdapterForTesting(throwing);

    const result = saveState(createDefaultState());
    expect(result.ok).toBe(false);
    expect(result.error).toBe("quota");
  });

  it("returns { ok: false, error: 'quota' } when soft quota is exceeded even after pruning", () => {
    // Build a state whose completedPuzzleIds alone exceeds SOFT_QUOTA_BYTES.
    // Each ID is ~10 bytes; 10000 unique IDs ≈ 100KB > 80KB.
    const state = createDefaultState();
    state.completedPuzzleIds = Array.from(
      { length: 10000 },
      (_, i) => `id-${i}-pad`,
    );

    const result = saveState(state);
    expect(result.ok).toBe(false);
    expect(result.error).toBe("quota");
  });
});

describe("resetState", () => {
  it("clears the persisted state", () => {
    const adapter = createMemoryAdapter();
    __setAdapterForTesting(adapter);
    adapter.setItem(STORAGE_KEY, JSON.stringify(createDefaultState()));

    expect(adapter.getItem(STORAGE_KEY)).not.toBeNull();
    resetState();
    expect(adapter.getItem(STORAGE_KEY)).toBeNull();
  });
});

describe("estimateSize", () => {
  it("returns the string length of a given state", () => {
    const state = createDefaultState();
    const expected = JSON.stringify(state).length;
    expect(estimateSize(state)).toBe(expected);
  });

  it("returns 0 when storage is empty and no state is provided", () => {
    expect(estimateSize()).toBe(0);
  });

  it("returns the on-disk size after a save", () => {
    const state = createDefaultState();
    state.completedPuzzleIds = ["kw-001", "em-001"];
    saveState(state);

    const raw = createMemoryAdapter();
    // Read from the injected adapter (same one used by saveState).
    const size = estimateSize();
    expect(size).toBeGreaterThan(0);
    void raw; // silence unused
  });
});

describe("exportState", () => {
  it("returns a pretty-printed JSON string of the current state", () => {
    const state = createDefaultState();
    saveState(state);

    const exported = exportState();
    expect(exported).toBe(JSON.stringify(loadState(), null, 2));

    // Must be parseable back to the same state.
    const parsed = JSON.parse(exported) as PersistedState;
    expect(parsed.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
  });
});

describe("isStorageAvailable", () => {
  it("returns true when the memory adapter is injected", () => {
    expect(isStorageAvailable()).toBe(true);
  });

  it("returns false when the adapter reports unavailable", () => {
    const unavailable: StorageAdapter = {
      getItem: () => null,
      setItem: () => {
        // no-op
      },
      removeItem: () => {
        // no-op
      },
      isAvailable: () => false,
    };
    __setAdapterForTesting(unavailable);
    expect(isStorageAvailable()).toBe(false);
  });
});

describe("SSR safety", () => {
  it("loadState does not throw when window is undefined", () => {
    const originalWindow = globalThis.window;
    vi.stubGlobal("window", undefined);
    try {
      const state = loadState();
      expect(state).toEqual(createDefaultState());
    } finally {
      vi.stubGlobal("window", originalWindow);
    }
  });

  it("saveState returns { ok: true } when window is undefined", () => {
    const originalWindow = globalThis.window;
    vi.stubGlobal("window", undefined);
    try {
      const result = saveState(createDefaultState());
      expect(result).toEqual({ ok: true });
    } finally {
      vi.stubGlobal("window", originalWindow);
    }
  });

  it("resetState does not throw when window is undefined", () => {
    const originalWindow = globalThis.window;
    vi.stubGlobal("window", undefined);
    try {
      expect(() => resetState()).not.toThrow();
    } finally {
      vi.stubGlobal("window", originalWindow);
    }
  });

  it("exportState returns an empty string when window is undefined", () => {
    const originalWindow = globalThis.window;
    vi.stubGlobal("window", undefined);
    try {
      expect(exportState()).toBe("");
    } finally {
      vi.stubGlobal("window", originalWindow);
    }
  });

  it("estimateSize returns 0 when window is undefined and no state given", () => {
    const originalWindow = globalThis.window;
    vi.stubGlobal("window", undefined);
    try {
      expect(estimateSize()).toBe(0);
    } finally {
      vi.stubGlobal("window", originalWindow);
    }
  });

  it("isStorageAvailable returns false when window is undefined", () => {
    const originalWindow = globalThis.window;
    vi.stubGlobal("window", undefined);
    try {
      expect(isStorageAvailable()).toBe(false);
    } finally {
      vi.stubGlobal("window", originalWindow);
    }
  });
});
