import type { Mode } from "@/lib/content/schemas";
import { normalizeAnswer } from "@/lib/game/match";
import { computeDailyTotal } from "@/lib/game/scoring";
import { RECENT_PUZZLES_CAP } from "./keys";
import { createDefaultState } from "./defaults";
import { dedupe, subtractDays } from "./internal";
import {
  estimateSize,
  isStorageAvailable,
  loadState,
  saveState,
} from "./client";
import type {
  AchievementId,
  AchievementsState,
  DailyProgress,
  ModeProgress,
  ModeStatus,
  PersistedState,
  SettingsState,
  StatsState,
  StreakState,
  UtcDate,
} from "./types";

/**
 * High-level, idempotent domain operations on the persisted state.
 *
 * This is the API React hooks and components call — they never touch
 * `client.ts` or the storage adapter directly. Every function is:
 *  - SSR-safe: returns a safe no-op/default when `window` is undefined or
 *    storage is unavailable.
 *  - Idempotent: repeating the same call with the same input is a no-op.
 *  - Atomic-ish: each call does one `loadState` → mutate → `saveState` cycle.
 */

// --- Mode → daily-key mapping -------------------------------------------

/** The four short keys used inside `DailyProgress` (kept short for JSON size). */
export type ModeKey = "kw" | "em" | "ss" | "tl";

/** Maps a `Mode` to its short key inside `DailyProgress`. */
function modeToKey(mode: Mode): ModeKey {
  switch (mode) {
    case "keywords":
      return "kw";
    case "emoji":
      return "em";
    case "screenshot":
      return "ss";
    case "timeline":
      return "tl";
  }
}

// --- Small pure helpers --------------------------------------------------

/**
 * Sums the scores of every present mode in a `DailyProgress` entry.
 * Delegates to the pure `computeDailyTotal` in the scoring engine
 * (guardrail #4 — single source of truth for the day-total formula).
 * Returns 0 when no modes are present. Max theoretical value is 400
 * (4 modes × 100).
 */
function computeDayTotal(day: DailyProgress): number {
  return computeDailyTotal({
    keywords: day.kw?.score,
    emoji: day.em?.score,
    screenshot: day.ss?.score,
    timeline: day.tl?.score,
  });
}

/** Returns true if the value is a completed status (solved or given_up). */
function isCompletedStatus(status: ModeStatus): boolean {
  return status === "solved" || status === "given_up";
}

/**
 * Pure streak recalculation (PRD §7.3). Given the current streak state and
 * today's UTC date, returns the streak state after a completed puzzle:
 *  - `lastActiveDate === yesterday` → `current + 1`.
 *  - `lastActiveDate === today` → `current` unchanged (idempotent).
 *  - Otherwise (broken streak or first-ever activity) → `current = 1`.
 *  - `max` is updated to `max(max, current)`.
 *  - `lastActiveDate` is set to `date`.
 *
 * Extracted so `recordModeResult` can fold streak recalculation into its
 * single save cycle (slice 4d-8) without a second loadState/saveState round
 * trip, while `recalcStreak` remains exported for explicit recalculation.
 */
function computeRecalculatedStreak(
  streak: StreakState,
  date: UtcDate,
): StreakState {
  const yesterday = subtractDays(date, 1);

  let newCurrent: number;
  if (streak.lastActiveDate === yesterday) {
    newCurrent = streak.current + 1;
  } else if (streak.lastActiveDate === date) {
    // Already active today — no change (idempotent).
    newCurrent = streak.current;
  } else {
    // Streak broken or first-ever activity.
    newCurrent = 1;
  }

  const newMax = Math.max(streak.max, newCurrent);
  return {
    current: newCurrent,
    max: newMax,
    lastActiveDate: date,
  };
}

// --- Read helpers --------------------------------------------------------

/**
 * Returns the `DailyProgress` for the given UTC date, or `undefined` if no
 * progress has been recorded for that day. SSR-safe.
 */
export function getProgress(date: UtcDate): DailyProgress | undefined {
  if (typeof window === "undefined") return undefined;
  return loadState().daily[date];
}

/** Returns the current stats. SSR-safe (returns defaults on the server). */
export function getStats(): StatsState {
  if (typeof window === "undefined") return createDefaultState().stats;
  return loadState().stats;
}

/** Returns the current streak. SSR-safe. */
export function getStreak(): StreakState {
  if (typeof window === "undefined") return createDefaultState().streak;
  return loadState().streak;
}

/** Returns the current settings. SSR-safe. */
export function getSettings(): SettingsState {
  if (typeof window === "undefined") return createDefaultState().settings;
  return loadState().settings;
}

/** Returns the current achievements. SSR-safe. */
export function getAchievements(): AchievementsState {
  if (typeof window === "undefined") return createDefaultState().achievements;
  return loadState().achievements;
}

/** Returns the list of completed puzzle IDs. SSR-safe. */
export function getCompletedPuzzleIds(): string[] {
  if (typeof window === "undefined") return [];
  return loadState().completedPuzzleIds;
}

/** Returns the recent puzzle IDs (most-recent-first). SSR-safe. */
export function getRecentPuzzleIds(): string[] {
  if (typeof window === "undefined") return [];
  return loadState().recentPuzzleIds;
}

// --- Write operations ----------------------------------------------------

/** Result of a recordModeResult call. */
export interface RecordResult {
  changed: boolean;
  state: PersistedState;
}

/**
 * Records (or updates) the result of a single mode attempt on the given
 * UTC date. Idempotent and non-downgrading.
 *
 * Duplicate / conflict resolution (when `date+mode` already has a record):
 *  - Same puzzleId + same status + same score → no-op (`changed: false`).
 *  - Old `solved`, new `given_up` → keep the old solved (never downgrade).
 *  - Old `solved` (higher/equal score), new `solved` → keep old (keep best).
 *  - Otherwise → overwrite with the new result.
 *
 * Side effects on `changed: true`:
 *  - `stats.modeBreakdown[mode]` increments on a NEW record (not on updates).
 *  - `stats.modeAvgScore[mode]` is recomputed incrementally.
 *  - `stats.gamesPlayed` +1 only when the record transitions to a completed
 *    status (solved/given_up) for the first time.
 *  - `stats.bestDailyScore` and `stats.last30Days[date]` are updated with the
 *    recomputed day total.
 *  - `recentPuzzleIds` gets `puzzleId` prepended (de-duplicated, capped).
 *  - `completedPuzzleIds` gets `puzzleId` added (de-duplicated) when the
 *    status is solved/given_up.
 *
 * SSR-safe: returns `{ changed: false, state: default }` on the server.
 */
export function recordModeResult(
  date: UtcDate,
  mode: Mode,
  result: {
    puzzleId: string;
    score: number;
    revealedClues: number;
    wrongGuesses: string[];
    status: ModeStatus;
  },
): RecordResult {
  if (typeof window === "undefined" || !isStorageAvailable()) {
    return { changed: false, state: createDefaultState() };
  }

  const state = loadState();
  const key = modeToKey(mode);
  const existingDay = state.daily[date];
  const dayEntry: DailyProgress = { ...(existingDay ?? {}) };
  const existing = dayEntry[key];

  // Defensive normalization (P1-1): clamp/validate inputs BEFORE constructing
  // the persisted record so a caller bug (score > 100, negative revealedClues,
  // empty-string wrong guess) cannot poison the on-disk state and trigger a
  // full-state discard on the next loadState.
  const clampedScore = Math.max(0, Math.min(100, Math.trunc(result.score) || 0));
  const clampedRevealedClues = Math.max(0, Math.trunc(result.revealedClues) || 0);
  const cleanedWrongGuesses = dedupe(
    result.wrongGuesses
      .map((g) => normalizeAnswer(g))
      .filter((g) => g.length > 0),
  );

  const newProgress: ModeProgress = {
    puzzleId: result.puzzleId,
    score: clampedScore,
    revealedClues: clampedRevealedClues,
    wrongGuesses: cleanedWrongGuesses,
    status: result.status,
    updatedAt: new Date().toISOString(),
  };

  // --- Idempotency / non-downgrade checks --------------------------------
  if (existing) {
    const samePuzzle = existing.puzzleId === newProgress.puzzleId;
    const sameStatus = existing.status === newProgress.status;
    const sameScore = existing.score === newProgress.score;

    if (samePuzzle && sameStatus && sameScore) {
      // Identical result — no-op.
      return { changed: false, state };
    }

    if (existing.status === "solved" && newProgress.status === "given_up") {
      // Never downgrade a solved attempt to given_up.
      return { changed: false, state };
    }

    if (
      existing.status === "solved" &&
      newProgress.status === "solved" &&
      newProgress.score <= existing.score
    ) {
      // Keep the better solved score.
      return { changed: false, state };
    }

    // `given_up` is terminal (P1-6): once a puzzle has been given up, a later
    // `solved` attempt for the same day+mode MUST NOT overwrite it. PRD §5.1:
    // "Once a puzzle is answered (correctly or via give-up), the result is
    // locked."
    if (existing.status === "given_up") {
      return { changed: false, state };
    }
    // Otherwise: fall through and overwrite with the new result.
  }

  // --- Build the new day entry + daily map -------------------------------
  const updatedDay: DailyProgress = { ...dayEntry, [key]: newProgress };
  const newDaily: Record<string, DailyProgress> = {
    ...state.daily,
    [date]: updatedDay,
  };

  // --- Update stats ------------------------------------------------------
  const stats: StatsState = { ...state.stats };
  const oldCount = stats.modeBreakdown[mode];
  const oldAvg = stats.modeAvgScore[mode];

  let newCount: number;
  let newAvg: number;
  if (!existing) {
    newCount = oldCount + 1;
    newAvg =
      oldCount === 0
        ? newProgress.score
        : (oldAvg * oldCount + newProgress.score) / newCount;
  } else {
    // Update: keep the count, recompute the average by swapping the old
    // score out and the new score in.
    newCount = oldCount;
    newAvg =
      oldCount === 0
        ? newProgress.score
        : (oldAvg * oldCount - existing.score + newProgress.score) / oldCount;
  }
  if (!Number.isFinite(newAvg) || newAvg < 0) {
    newAvg = 0;
  }

  stats.modeBreakdown = {
    ...stats.modeBreakdown,
    [mode]: newCount,
  };
  stats.modeAvgScore = {
    ...stats.modeAvgScore,
    [mode]: newAvg,
  };

  // gamesPlayed: increment only on the first transition to a completed status.
  const isCompleting = isCompletedStatus(newProgress.status);
  const wasCompleted = existing ? isCompletedStatus(existing.status) : false;
  if (isCompleting && !wasCompleted) {
    stats.gamesPlayed = stats.gamesPlayed + 1;
  }

  // Day total drives bestDailyScore and the last30Days heatmap.
  const dayTotal = computeDayTotal(updatedDay);
  stats.bestDailyScore = Math.max(stats.bestDailyScore, dayTotal);
  stats.last30Days = { ...stats.last30Days, [date]: dayTotal };

  // --- Update recent + completed puzzle lists ----------------------------
  const filteredRecent = state.recentPuzzleIds.filter(
    (id) => id !== newProgress.puzzleId,
  );
  const recentPuzzleIds = [newProgress.puzzleId, ...filteredRecent].slice(
    0,
    RECENT_PUZZLES_CAP,
  );

  let completedPuzzleIds = state.completedPuzzleIds;
  if (
    isCompleting &&
    !completedPuzzleIds.includes(newProgress.puzzleId)
  ) {
    completedPuzzleIds = [...completedPuzzleIds, newProgress.puzzleId];
  }

  // --- Update streak (PRD §7.3) ------------------------------------------
  // A streak day counts when the player completes at least 1 puzzle in the
  // Daily Challenge for that UTC day. Folding the recalculation into the
  // same save cycle guarantees the streak is always consistent with the
  // recorded progress — no separate `recalcStreak` call needed at the call
  // site (slice 4d-8). The recalculation is idempotent, so a duplicate or
  // upgrade record (same date) leaves the streak unchanged.
  const newStreak = isCompleting
    ? computeRecalculatedStreak(state.streak, date)
    : state.streak;

  const newState: PersistedState = {
    ...state,
    daily: newDaily,
    stats,
    streak: newStreak,
    recentPuzzleIds,
    completedPuzzleIds,
  };

  saveState(newState);
  return { changed: true, state: newState };
}

/**
 * Marks the daily challenge for `date` as completed by stamping
 * `daily[date].completedAt = now`. Idempotent within the same wall-clock
 * minute (rapid double-calls are no-ops). SSR-safe.
 */
export function completeDailyChallenge(date: UtcDate): { changed: boolean } {
  if (typeof window === "undefined" || !isStorageAvailable()) {
    return { changed: false };
  }
  const state = loadState();
  const existingDay = state.daily[date];
  const dayEntry: DailyProgress = { ...(existingDay ?? {}) };

  const now = new Date().toISOString();
  const nowMinute = now.slice(0, 16); // YYYY-MM-DDTHH:MM
  const existingMinute = dayEntry.completedAt?.slice(0, 16);

  if (existingMinute === nowMinute) {
    return { changed: false };
  }

  const updatedDay: DailyProgress = { ...dayEntry, completedAt: now };
  const newState: PersistedState = {
    ...state,
    daily: { ...state.daily, [date]: updatedDay },
  };
  saveState(newState);
  return { changed: true };
}

/**
 * Adds `id` to `completedPuzzleIds` (de-duplicated). No-op if already
 * present. SSR-safe.
 */
export function addCompletedPuzzle(id: string): { changed: boolean } {
  if (typeof window === "undefined" || !isStorageAvailable()) {
    return { changed: false };
  }
  const state = loadState();
  if (state.completedPuzzleIds.includes(id)) {
    return { changed: false };
  }
  const newState: PersistedState = {
    ...state,
    completedPuzzleIds: [...state.completedPuzzleIds, id],
  };
  saveState(newState);
  return { changed: true };
}

/**
 * Prepends `id` to `recentPuzzleIds` (most-recent-first), de-duplicates, and
 * truncates to `RECENT_PUZZLES_CAP`. No-op if `id` is already at the front.
 * SSR-safe.
 */
export function addRecentPuzzle(id: string): { changed: boolean } {
  if (typeof window === "undefined" || !isStorageAvailable()) {
    return { changed: false };
  }
  const state = loadState();
  if (state.recentPuzzleIds[0] === id) {
    return { changed: false };
  }
  const filtered = state.recentPuzzleIds.filter((x) => x !== id);
  const recentPuzzleIds = [id, ...filtered].slice(0, RECENT_PUZZLES_CAP);
  const newState: PersistedState = {
    ...state,
    recentPuzzleIds,
  };
  saveState(newState);
  return { changed: true };
}

/**
 * Unlocks achievement `id`. No-op if already unlocked. Sets `updatedAt` to
 * the current ISO timestamp on a new unlock. SSR-safe.
 */
export function unlockAchievement(id: AchievementId): { changed: boolean } {
  if (typeof window === "undefined" || !isStorageAvailable()) {
    return { changed: false };
  }
  const state = loadState();
  if (state.achievements.unlocked.includes(id)) {
    return { changed: false };
  }
  const newState: PersistedState = {
    ...state,
    achievements: {
      unlocked: [...state.achievements.unlocked, id],
      updatedAt: new Date().toISOString(),
    },
  };
  saveState(newState);
  return { changed: true };
}

/**
 * Merges `partial` into the current settings. No-op if no values actually
 * change. SSR-safe.
 */
export function updateSettings(
  partial: Partial<SettingsState>,
): { changed: boolean } {
  if (typeof window === "undefined" || !isStorageAvailable()) {
    return { changed: false };
  }
  const state = loadState();
  const newSettings: SettingsState = { ...state.settings, ...partial };
  // Compare the full serialized shape (P2-5) so a future SettingsState field
  // is automatically detected as changed without updating this predicate.
  const changed = JSON.stringify(newSettings) !== JSON.stringify(state.settings);
  if (!changed) {
    return { changed: false };
  }
  const newState: PersistedState = {
    ...state,
    settings: newSettings,
  };
  saveState(newState);
  return { changed: true };
}

/**
 * Recalculates the streak based on `lastActiveDate` and the given `date`
 * (today). Rules:
 *  - `lastActiveDate === yesterday` → `current + 1`.
 *  - `lastActiveDate === today` → `current` unchanged (idempotent).
 *  - Otherwise (broken streak or first-ever activity) → `current = 1`.
 *  - `max` is updated to `max(max, current)`.
 *  - `lastActiveDate` is set to `date`.
 *
 * NOTE: Since slice 4d-8, `recordModeResult` folds streak recalculation into
 * its own save cycle, so callers no longer need to invoke `recalcStreak`
 * separately after recording a result. This function remains exported for
 * explicit recalculation (e.g., a future "repair streak" admin action or a
 * migration step). SSR-safe.
 */
export function recalcStreak(date: UtcDate): { changed: boolean } {
  if (typeof window === "undefined" || !isStorageAvailable()) {
    return { changed: false };
  }
  const state = loadState();
  const newStreak = computeRecalculatedStreak(state.streak, date);

  // No-op if nothing would change.
  if (
    newStreak.current === state.streak.current &&
    newStreak.max === state.streak.max &&
    state.streak.lastActiveDate === date
  ) {
    return { changed: false };
  }

  const newState: PersistedState = {
    ...state,
    streak: newStreak,
  };
  saveState(newState);
  return { changed: true };
}

// --- Utility re-exports (for convenience) -------------------------------

/**
 * Approximate byte size of the current persisted state. Re-exported from
 * `client.ts` so hooks can show a "storage usage" indicator without a
 * second import.
 */
export { estimateSize };
