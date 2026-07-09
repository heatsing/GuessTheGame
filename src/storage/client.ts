import {
  CURRENT_SCHEMA_VERSION,
  DAILY_RETENTION_DAYS,
  LAST30_RETENTION,
  RECENT_PUZZLES_CAP,
  SOFT_QUOTA_BYTES,
  STORAGE_KEY,
} from "./keys";
import { createDefaultState } from "./defaults";
import { getDefaultAdapter } from "./adapter";
import { migrate } from "./migrate";
import { dedupe, dedupeAndCap, subtractDays } from "./internal";
import type { DailyProgress, PersistedState } from "./types";

/**
 * Safe read/write entry point for the persisted state.
 *
 * This module is the ONLY place in the codebase that touches the storage
 * adapter directly. React/hooks/components call `actions.ts` (which delegates
 * here) — they never call localStorage themselves.
 *
 * Guarantees:
 *  - SSR-safe: every function detects `typeof window === 'undefined'` and
 *    returns a no-op/default without touching the adapter.
 *  - Never silently destroys user data: corrupted JSON returns a default but
 *    is NOT written back over the original key (the raw string is preserved
 *    under `:corrupted` for potential recovery).
 *  - Pruning + soft quota enforcement on every write.
 */

/** Key used to stash corrupted raw state for potential manual recovery. */
const CORRUPTED_KEY = STORAGE_KEY + ":corrupted";

// --- Date helpers (UTC, no local-timezone drift) -------------------------

/**
 * Returns today's UTC date as `YYYY-MM-DD`. Uses `new Date().toISOString()`
 * which is always UTC regardless of the device timezone (PRD §5.1, §7.3).
 */
function utcToday(): string {
  return new Date().toISOString().slice(0, 10);
}

// --- Pruning helpers -----------------------------------------------------

/**
 * Returns a new `daily` map containing only entries within the last
 * `retentionDays` days (inclusive of the cutoff). Lexicographic comparison
 * is safe for `YYYY-MM-DD` strings.
 */
function pruneDaily(
  daily: Record<string, DailyProgress>,
  today: string,
  retentionDays: number,
): Record<string, DailyProgress> {
  const cutoff = subtractDays(today, retentionDays);
  const out: Record<string, DailyProgress> = {};
  for (const [date, entry] of Object.entries(daily)) {
    if (date >= cutoff) {
      out[date] = entry;
    }
  }
  return out;
}

/**
 * Returns a new `last30Days` map containing only entries within the last
 * `retentionDays` days (inclusive of the cutoff).
 */
function pruneLast30(
  last30: Record<string, number>,
  today: string,
  retentionDays: number,
): Record<string, number> {
  const cutoff = subtractDays(today, retentionDays);
  const out: Record<string, number> = {};
  for (const [date, score] of Object.entries(last30)) {
    if (date >= cutoff) {
      out[date] = score;
    }
  }
  return out;
}

// --- Public API ----------------------------------------------------------

/**
 * Loads and migrates the persisted state.
 *
 * SSR-safe: returns a fresh default on the server without touching the
 * adapter. On the client, returns a default when storage is empty, JSON is
 * corrupted, or migration/validation fails. Corrupted raw JSON is stashed
 * under `:corrupted` (best-effort, never overwrites the primary key) so the
 * player can manually recover it later.
 */
export function loadState(): PersistedState {
  if (typeof window === "undefined") return createDefaultState();
  const adapter = getDefaultAdapter();
  if (!adapter.isAvailable()) return createDefaultState();

  const raw = adapter.getItem(STORAGE_KEY);
  if (raw === null) return createDefaultState();

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    // Corrupted JSON — do NOT overwrite the primary key. Stash the raw
    // string under :corrupted for potential manual recovery.
    console.warn(
      "[gtg:storage] Failed to parse persisted state; returning default.",
      err,
    );
    try {
      adapter.setItem(CORRUPTED_KEY, raw);
    } catch {
      // Best-effort; ignore.
    }
    return createDefaultState();
  }

  return migrate(parsed);
}

/**
 * Result of a save attempt. `ok: false` with `error: "quota"` indicates the
 * write was rejected due to capacity limits (soft quota exceeded even after
 * pruning, or the browser threw `QuotaExceededError`).
 */
export interface SaveResult {
  ok: boolean;
  error?: "quota" | "unavailable";
}

/**
 * Prunes, serializes, and writes the state to storage.
 *
 * Pruning applied before every write:
 *  - `daily` keeps only the last `DAILY_RETENTION_DAYS` days.
 *  - `stats.last30Days` keeps only the last `LAST30_RETENTION` days.
 *  - `recentPuzzleIds` is de-duplicated and truncated to `RECENT_PUZZLES_CAP`.
 *  - `completedPuzzleIds` is de-duplicated.
 *
 * Capacity: if the serialized size exceeds `SOFT_QUOTA_BYTES`, the oldest
 * `last30Days` entries are dropped one by one until under quota or the map
 * is empty. If still over, returns `{ ok: false, error: "quota" }`.
 *
 * SSR-safe: no-op returning `{ ok: true }` on the server.
 */
export function saveState(state: PersistedState): SaveResult {
  if (typeof window === "undefined") return { ok: true };
  const adapter = getDefaultAdapter();
  if (!adapter.isAvailable()) return { ok: false, error: "unavailable" };

  const today = utcToday();
  let working: PersistedState = {
    ...state,
    schemaVersion: CURRENT_SCHEMA_VERSION,
    daily: pruneDaily(state.daily, today, DAILY_RETENTION_DAYS),
    stats: {
      ...state.stats,
      last30Days: pruneLast30(
        state.stats.last30Days,
        today,
        LAST30_RETENTION,
      ),
    },
    recentPuzzleIds: dedupeAndCap(state.recentPuzzleIds, RECENT_PUZZLES_CAP),
    completedPuzzleIds: dedupe(state.completedPuzzleIds),
  };

  let size = JSON.stringify(working).length;

  // Soft quota: shed oldest last30Days entries until under the cap.
  if (size > SOFT_QUOTA_BYTES) {
    const last30: Record<string, number> = { ...working.stats.last30Days };
    const sortedDates = Object.keys(last30).sort(); // ascending = oldest first
    while (size > SOFT_QUOTA_BYTES && sortedDates.length > 0) {
      const oldest = sortedDates.shift();
      if (oldest !== undefined) {
        delete last30[oldest];
      }
      working = {
        ...working,
        stats: { ...working.stats, last30Days: last30 },
      };
      size = JSON.stringify(working).length;
    }
    if (size > SOFT_QUOTA_BYTES) {
      return { ok: false, error: "quota" };
    }
  }

  try {
    adapter.setItem(STORAGE_KEY, JSON.stringify(working));
    return { ok: true };
  } catch (err) {
    // QuotaExceededError or any other setItem failure — report as quota.
    console.warn("[gtg:storage] setItem failed.", err);
    return { ok: false, error: "quota" };
  }
}

/**
 * Removes the persisted state entirely. Only called from explicit "clear my
 * data" UI — never automatically. SSR-safe.
 */
export function resetState(): void {
  if (typeof window === "undefined") return;
  const adapter = getDefaultAdapter();
  try {
    adapter.removeItem(STORAGE_KEY);
  } catch {
    // Best-effort.
  }
}

/**
 * Approximates the byte size of the state as `JSON.stringify(state).length`.
 * With no argument, measures the on-disk raw string length (0 if empty or
 * SSR). This is a byte approximation, not exact bytes (UTF-16 code units).
 */
export function estimateSize(state?: PersistedState): number {
  if (state !== undefined) {
    return JSON.stringify(state).length;
  }
  if (typeof window === "undefined") return 0;
  const raw = getDefaultAdapter().getItem(STORAGE_KEY);
  return raw === null ? 0 : raw.length;
}

/**
 * Returns a pretty-printed JSON string of the current state for the "export
 * my data" UI. Returns an empty string on SSR. The output is always valid
 * JSON (2-space indented).
 */
export function exportState(): string {
  if (typeof window === "undefined") return "";
  return JSON.stringify(loadState(), null, 2);
}

/**
 * Returns whether the default storage adapter is currently available.
 * On SSR this is always false (no persistent storage on the server).
 */
export function isStorageAvailable(): boolean {
  if (typeof window === "undefined") return false;
  return getDefaultAdapter().isAvailable();
}
