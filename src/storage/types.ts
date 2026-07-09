import { z } from "zod";

/**
 * Persisted state shapes (V1 legacy + V2 current) for the localStorage
 * persistence layer.
 *
 * See `docs/architecture.md` §6 (data layer) and §7 (schema versioning).
 * The authoritative version is the `schemaVersion` field on each persisted
 * object; the localStorage key string stays stable across versions.
 */

// --- UTC date string -----------------------------------------------------

/**
 * UTC calendar date in `YYYY-MM-DD` form (no time, no timezone).
 *
 * The string itself is the source of truth — we don't construct real Date
 * objects for schedule keys because local-timezone Date math would break the
 * "UTC midnight reset" invariant (PRD §5.1, §7.3).
 */
export type UtcDate = string;

const UTC_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

/** Zod schema for a `YYYY-MM-DD` UTC date string. */
export const UtcDateSchema = z
  .string()
  .regex(UTC_DATE_REGEX, "UTC date must match `YYYY-MM-DD`");

// --- Mode progress -------------------------------------------------------

/** Lifecycle status of a single mode attempt on a given day. */
export const ModeStatusSchema = z.enum(["in_progress", "solved", "given_up"]);
export type ModeStatus = z.infer<typeof ModeStatusSchema>;

/**
 * Zod schema for a single mode's progress on a given day.
 *
 * `revealedClues` is the count of clues the player revealed (for keywords:
 * revealed keyword count; for emoji: shown emoji count). `wrongGuesses` is a
 * de-duplicated list of incorrect guesses the player entered.
 */
export const ModeProgressSchema = z.object({
  puzzleId: z.string().min(1),
  score: z.number().int().min(0).max(100),
  revealedClues: z.number().int().min(0),
  wrongGuesses: z.array(z.string().min(1)),
  status: ModeStatusSchema,
  updatedAt: z.string().min(1),
});
export type ModeProgress = z.infer<typeof ModeProgressSchema>;

// --- Daily progress ------------------------------------------------------

/**
 * Zod schema for one UTC day's progress across all four modes.
 *
 * Keys are the two-letter mode prefixes (`kw`, `em`, `ss`, `tl`) — short to
 * keep the persisted JSON small (PRD R4 < 100KB target).
 */
export const DailyProgressSchema = z.object({
  kw: ModeProgressSchema.optional(),
  em: ModeProgressSchema.optional(),
  ss: ModeProgressSchema.optional(),
  tl: ModeProgressSchema.optional(),
  completedAt: z.string().optional(),
});
export type DailyProgress = z.infer<typeof DailyProgressSchema>;

// --- Streak --------------------------------------------------------------

export const StreakStateSchema = z.object({
  current: z.number().int().min(0),
  max: z.number().int().min(0),
  lastActiveDate: UtcDateSchema.nullable(),
});
export type StreakState = z.infer<typeof StreakStateSchema>;

// --- Stats ---------------------------------------------------------------

const MODE_KEYS = ["keywords", "emoji", "screenshot", "timeline"] as const;

const modeCountMap = z.object({
  keywords: z.number().int().min(0),
  emoji: z.number().int().min(0),
  screenshot: z.number().int().min(0),
  timeline: z.number().int().min(0),
});

const modeAvgMap = z.object({
  keywords: z.number().min(0),
  emoji: z.number().min(0),
  screenshot: z.number().min(0),
  timeline: z.number().min(0),
});

export const StatsStateSchema = z.object({
  gamesPlayed: z.number().int().min(0),
  /** Best single-day total score across all modes (0–400). */
  bestDailyScore: z.number().int().min(0),
  modeBreakdown: modeCountMap,
  modeAvgScore: modeAvgMap,
  /** UTC date → daily total score, for the heatmap (0–400). */
  last30Days: z.record(UtcDateSchema, z.number().min(0)),
});
export type StatsState = z.infer<typeof StatsStateSchema>;

// --- Settings ------------------------------------------------------------

export const ThemeSchema = z.enum(["dark", "light", "system"]);

/** V2 settings shape (V1 had an empty `{}` settings object). */
export const SettingsStateSchema = z.object({
  theme: ThemeSchema,
  reducedMotion: z.boolean(),
  soundEnabled: z.boolean(),
});
export type SettingsState = z.infer<typeof SettingsStateSchema>;

// --- Achievements --------------------------------------------------------

/**
 * Achievement identifier. A small set of literal IDs is enumerated for
 * type-safety in callers, but any string is allowed at runtime so future
 * achievements don't require a schema migration.
 */
export const AchievementIdSchema = z.union([
  z.literal("first-win"),
  z.literal("streak-7"),
  z.literal("all-modes"),
  z.literal("daily-complete"),
  z.string(),
]);
export type AchievementId = z.infer<typeof AchievementIdSchema>;

export const AchievementsStateSchema = z.object({
  unlocked: z.array(AchievementIdSchema),
  updatedAt: z.string().nullable(),
});
export type AchievementsState = z.infer<typeof AchievementsStateSchema>;

// --- V2 PersistedState ---------------------------------------------------

/**
 * Zod schema for the current (V2) persisted state shape. Used at runtime to
 * validate data read from localStorage after migration.
 */
export const V2Schema = z.object({
  schemaVersion: z.literal(2),
  daily: z.record(UtcDateSchema, DailyProgressSchema),
  streak: StreakStateSchema,
  stats: StatsStateSchema,
  settings: SettingsStateSchema,
  completedPuzzleIds: z.array(z.string().min(1)),
  recentPuzzleIds: z.array(z.string().min(1)),
  achievements: AchievementsStateSchema,
});

/** Current persisted state shape (schemaVersion: 2). */
export type PersistedState = z.infer<typeof V2Schema>;

// --- V1 legacy shape (for migration) ------------------------------------

/**
 * The pre-V2 persisted shape (the original MVP state).
 *
 * `settings` was an empty object; the V2 migration fills it with defaults.
 * V1 had no `completedPuzzleIds`, `recentPuzzleIds`, or `achievements`.
 */
export interface PersistedStateV1 {
  schemaVersion: 1;
  daily: Record<string, DailyProgress>;
  streak: StreakState;
  stats: StatsState;
  settings: Record<string, never>;
}

export { MODE_KEYS };
