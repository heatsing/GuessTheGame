/**
 * Public entry point for the localStorage persistence layer.
 *
 * Import from `@/storage` — never reach into individual submodules from
 * application code. This barrel keeps the dependency graph explicit and
 * makes future internal refactors (e.g., swapping the adapter) transparent
 * to consumers.
 */

// --- Constants -----------------------------------------------------------
export {
  CURRENT_SCHEMA_VERSION,
  DAILY_RETENTION_DAYS,
  LAST30_RETENTION,
  RECENT_PUZZLES_CAP,
  SOFT_QUOTA_BYTES,
  STORAGE_KEY,
} from "./keys";

// --- Types ---------------------------------------------------------------
export type {
  AchievementId,
  AchievementsState,
  DailyProgress,
  ModeProgress,
  ModeStatus,
  PersistedState,
  PersistedStateV1,
  SettingsState,
  StatsState,
  StreakState,
  UtcDate,
} from "./types";
export {
  AchievementIdSchema,
  AchievementsStateSchema,
  DailyProgressSchema,
  ModeStatusSchema,
  ModeProgressSchema,
  SettingsStateSchema,
  StatsStateSchema,
  StreakStateSchema,
  ThemeSchema,
  UtcDateSchema,
  V2Schema,
} from "./types";

// --- Defaults ------------------------------------------------------------
export {
  createDefaultAchievements,
  createDefaultSettings,
  createDefaultState,
  createDefaultStats,
  createDefaultStreak,
} from "./defaults";

// --- Adapter -------------------------------------------------------------
export {
  __setAdapterForTesting,
  createLocalStorageAdapter,
  createMemoryAdapter,
  defaultAdapter,
  getDefaultAdapter,
} from "./adapter";
export type { StorageAdapter } from "./adapter";

// --- Migration -----------------------------------------------------------
export { migrate, migrations } from "./migrate";

// --- Client (low-level read/write) ---------------------------------------
export {
  estimateSize,
  exportState,
  isStorageAvailable,
  loadState,
  resetState,
  saveState,
} from "./client";
export type { SaveResult } from "./client";

// --- Actions (high-level domain ops) -------------------------------------
export {
  addCompletedPuzzle,
  addRecentPuzzle,
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
export type { RecordResult } from "./actions";
