/**
 * Central key + capacity registry for the localStorage persistence layer.
 *
 * Per `docs/architecture.md` §6, the entire app state lives under a single
 * top-level key. The `:v1` suffix on the key is a human-readable hint only —
 * the authoritative version is the `schemaVersion` field inside the JSON
 * object (see §7). The key string itself must remain stable across schema
 * versions so migrations remain atomic and old keys never orphan.
 */

/**
 * Single top-level localStorage key holding the entire persisted state JSON.
 * Stable across schema versions — do NOT bump the `v1` in this string when
 * bumping `CURRENT_SCHEMA_VERSION`.
 */
export const STORAGE_KEY = "gtg:state:v1" as const;

/**
 * Authoritative schema version written into every persisted object's
 * `schemaVersion` field. Bump this when the persisted shape changes and add
 * a migration in `./migrate.ts`.
 */
export const CURRENT_SCHEMA_VERSION = 2 as const;

/**
 * Soft quota target in bytes (UTF-16-ish byte approximation via string
 * length). PRD R4 targets < 100KB total; we keep a 20KB safety margin so
 * `QuotaExceededError` is never a surprise in normal use.
 */
export const SOFT_QUOTA_BYTES = 80000 as const;

/**
 * Number of days of `daily` entries to retain on save. PRD §7.4 / §6 cap.
 * Entries older than this are pruned on every `saveState` call.
 */
export const DAILY_RETENTION_DAYS = 60 as const;

/**
 * Number of days of `stats.last30Days` heatmap entries to retain on save.
 */
export const LAST30_RETENTION = 30 as const;

/**
 * Maximum number of entries kept in `recentPuzzleIds` (most-recent-first).
 */
export const RECENT_PUZZLES_CAP = 20 as const;
