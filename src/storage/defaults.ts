import { CURRENT_SCHEMA_VERSION } from "./keys";
import type {
  AchievementsState,
  PersistedState,
  SettingsState,
  StatsState,
  StreakState,
} from "./types";

/**
 * Default factory functions for the persisted state graph.
 *
 * Each factory returns a fresh, deeply-independent object so callers can
 * mutate the result without risk of leaking state into subsequent calls.
 */

/**
 * Default V2 settings: respect OS theme, full motion, sound on.
 *
 * Returned as a standalone factory so the migration path can fill V1's empty
 * settings object without recursively building the entire state.
 */
export function createDefaultSettings(): SettingsState {
  return {
    theme: "system",
    reducedMotion: false,
    soundEnabled: true,
  };
}

/** Default streak: zeroed, never active. */
export function createDefaultStreak(): StreakState {
  return {
    current: 0,
    max: 0,
    lastActiveDate: null,
  };
}

/** Default stats: zeroed counters, empty heatmap. */
export function createDefaultStats(): StatsState {
  return {
    gamesPlayed: 0,
    bestDailyScore: 0,
    modeBreakdown: {
      keywords: 0,
      emoji: 0,
      screenshot: 0,
      timeline: 0,
    },
    modeAvgScore: {
      keywords: 0,
      emoji: 0,
      screenshot: 0,
      timeline: 0,
    },
    last30Days: {},
  };
}

/** Default achievements: none unlocked. */
export function createDefaultAchievements(): AchievementsState {
  return {
    unlocked: [],
    updatedAt: null,
  };
}

/**
 * Returns a brand-new V2 persisted state with all fields defaulted.
 *
 * Always returns a fresh deep copy — safe to mutate freely. The returned
 * object passes `V2Schema.safeParse` by construction.
 */
export function createDefaultState(): PersistedState {
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    daily: {},
    streak: createDefaultStreak(),
    stats: createDefaultStats(),
    settings: createDefaultSettings(),
    completedPuzzleIds: [],
    recentPuzzleIds: [],
    achievements: createDefaultAchievements(),
  };
}
