import { CURRENT_SCHEMA_VERSION } from "./keys";
import { createDefaultState } from "./defaults";
import {
  createDefaultAchievements,
  createDefaultSettings,
  createDefaultStats,
  createDefaultStreak,
} from "./defaults";
import { V2Schema } from "./types";
import type { PersistedState } from "./types";

/**
 * Schema migration engine for the persisted state.
 *
 * Design (see `docs/architecture.md` §7):
 *  - Migrations are chained, pure functions: `v1 → v2 → v3 → ...`.
 *  - Each migration takes the previous version's shape and returns the next.
 *  - The chain is run inside `migrate()`; the final result is validated
 *    against `V2Schema` before being returned.
 *  - Idempotent: running `migrate()` on an already-current object is a no-op
 *    (the `while` loop never executes; the V2 fast-path validates and returns).
 *  - Pure: no I/O, no side effects. All failures fall back to a fresh default.
 *
 * Forward compatibility: if `schemaVersion` is greater than
 * `CURRENT_SCHEMA_VERSION` (player is running an older cached build against
 * newer state), we return a default. The unknown state is NOT overwritten —
 * `migrate()` is pure, so the on-disk bytes are preserved for a future build
 * that can interpret them.
 */

/**
 * Migration registry. Key = source version; value = function transforming
 * that version's shape into the next version (and bumping `schemaVersion`).
 */
export const migrations: Record<number, (input: unknown) => unknown> = {
  1: (input: unknown): unknown => {
    // Defensive: if the V1 payload is not a plain object, fall back to a
    // full default. The caller (migrate) will re-validate the result.
    if (typeof input !== "object" || input === null || Array.isArray(input)) {
      return createDefaultState();
    }
    const v1 = input as Record<string, unknown>;
    return {
      schemaVersion: 2,
      // Preserve existing data verbatim — lossless by default (§7).
      daily: (v1["daily"] as PersistedState["daily"]) ?? {},
      streak: (v1["streak"] as PersistedState["streak"]) ?? createDefaultStreak(),
      stats: (v1["stats"] as PersistedState["stats"]) ?? createDefaultStats(),
      // V1 settings was `{}`; upgrade to full defaults.
      settings: createDefaultSettings(),
      // V2 additions: initialize empty.
      completedPuzzleIds: [],
      recentPuzzleIds: [],
      achievements: createDefaultAchievements(),
    };
  },
};

/**
 * Returns true if `raw` is a plain object (not null, not an array).
 * JSON only produces objects, arrays, and primitives, so this is sufficient
 * for distinguishing a persisted state object from corrupted/empty data.
 */
function isPlainObject(raw: unknown): raw is Record<string, unknown> {
  return typeof raw === "object" && raw !== null && !Array.isArray(raw);
}

/**
 * Reads the `schemaVersion` field from an unknown payload.
 * Missing or non-numeric `schemaVersion` is treated as V1 (the original
 * MVP shape had no version field — see §7).
 */
function readVersion(raw: unknown): number {
  if (!isPlainObject(raw)) return 1;
  const v = raw["schemaVersion"];
  return typeof v === "number" && Number.isFinite(v) ? v : 1;
}

/**
 * Migrates a raw payload (just read from storage) to the current
 * `PersistedState` shape. Pure and idempotent.
 *
 * Behavior:
 *  1. Non-object input (null, arrays, primitives) → default state.
 *  2. `schemaVersion > CURRENT` → default state (forward-compat safety).
 *  3. `schemaVersion === CURRENT` → validate with `V2Schema`; on failure
 *     return default.
 *  4. `schemaVersion < CURRENT` → run the migration chain, then validate.
 *
 * Never throws. Never performs I/O.
 */
export function migrate(raw: unknown): PersistedState {
  // (1) Non-object input is unrecoverable.
  if (!isPlainObject(raw)) {
    return createDefaultState();
  }

  const version = readVersion(raw);

  // (2) Forward compatibility: unknown future version.
  if (version > CURRENT_SCHEMA_VERSION) {
    return createDefaultState();
  }

  // (3) Already at current version — validate and return.
  if (version === CURRENT_SCHEMA_VERSION) {
    const parsed = V2Schema.safeParse(raw);
    return parsed.success ? parsed.data : createDefaultState();
  }

  // (4) Run the migration chain.
  let current: unknown = raw;
  let currentVersion = version;
  let guard = 0;
  while (currentVersion < CURRENT_SCHEMA_VERSION) {
    // Hard cap on iterations to guarantee termination even if a migration
    // is buggy and doesn't advance the version.
    if (guard++ > CURRENT_SCHEMA_VERSION) {
      return createDefaultState();
    }
    const fn = migrations[currentVersion];
    if (!fn) {
      // No migration registered for this source version — bail to default.
      return createDefaultState();
    }
    const prevVersion = currentVersion;
    current = fn(current);
    currentVersion = readVersion(current);
    // If the migration failed to advance the version, bail to avoid spin.
    if (currentVersion <= prevVersion) {
      return createDefaultState();
    }
  }

  const parsed = V2Schema.safeParse(current);
  return parsed.success ? parsed.data : createDefaultState();
}
