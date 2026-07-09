import { z } from "zod";

/**
 * Content model schemas for Guess the Game.
 *
 * Source of truth for puzzle validation. Consumed by:
 *  - The Next.js app (build-time data loading via `./loader.ts`)
 *  - Unit tests (`./schemas.test.ts`)
 *  - Node validation scripts (`scripts/*.mjs`) via Node's TypeScript stripping
 *
 * See `docs/PRD.md` §6 Content Model for the JSON examples these schemas mirror.
 */

// --- Enums ---------------------------------------------------------------

export const DomainEnum = z.enum([
  "geography",
  "science",
  "history",
  "nature",
  "everyday",
]);
export type Domain = z.infer<typeof DomainEnum>;

export const ModeEnum = z.enum([
  "keywords",
  "emoji",
  "screenshot",
  "timeline",
]);
export type Mode = z.infer<typeof ModeEnum>;

// --- Shared primitives ---------------------------------------------------

/**
 * Puzzle IDs follow the format `<mode-prefix>-<3 digits>` (e.g. kw-001, em-001,
 * ss-001, tl-001). Two lowercase letters, a hyphen, three digits.
 */
export const PuzzleIdSchema = z
  .string()
  .regex(/^[a-z]{2}-\d{3}$/, "ID must match format `xx-000` (e.g. kw-001)");

// --- Base entry ----------------------------------------------------------

/**
 * Base fields shared by every puzzle. `target` and `aliases` are required for
 * the three guess-based modes (keywords, emoji, screenshot). Timeline omits
 * them via `.omit()` and adds `items` instead.
 */
export const GameEntrySchema = z.object({
  id: PuzzleIdSchema,
  mode: ModeEnum,
  domain: DomainEnum,
  target: z.string().min(1),
  aliases: z.array(z.string().min(1)),
  fact: z.string().min(1),
});
export type GameEntry = z.infer<typeof GameEntrySchema>;

// --- Keywords ------------------------------------------------------------

export const KeywordsPuzzleSchema = GameEntrySchema.extend({
  mode: z.literal("keywords"),
  /** 4-6 keyword clues ordered from vague to specific. PRD §5.2 caps at 6. */
  keywords: z.array(z.string().min(1)).min(4).max(6),
});
export type KeywordsPuzzle = z.infer<typeof KeywordsPuzzleSchema>;

// --- Emoji ---------------------------------------------------------------

export const EmojiHintsSchema = z.object({
  category: z.string().min(1),
  firstLetter: z.string().min(1),
});

export const EmojiPuzzleSchema = GameEntrySchema.extend({
  mode: z.literal("emoji"),
  /** 3-6 emojis shown all at once. */
  emojis: z.array(z.string().min(1)).min(3).max(6),
  hints: EmojiHintsSchema,
});
export type EmojiPuzzle = z.infer<typeof EmojiPuzzleSchema>;

// --- Screenshot ----------------------------------------------------------

export const ScreenshotPuzzleSchema = GameEntrySchema.extend({
  mode: z.literal("screenshot"),
  /** Public path under /public, e.g. `/images/puzzles/ss-001.webp`. */
  image: z.string().min(1),
  imageLicense: z.string().min(1),
  imageAttribution: z.string().min(1),
});
export type ScreenshotPuzzle = z.infer<typeof ScreenshotPuzzleSchema>;

// --- Timeline ------------------------------------------------------------

export const TimelineItemSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  date: z.number(),
});

/**
 * Timeline puzzles have no `target`/`aliases` — the player orders `items`
 * chronologically rather than guessing a word.
 */
export const TimelinePuzzleSchema = GameEntrySchema.omit({
  target: true,
  aliases: true,
}).extend({
  mode: z.literal("timeline"),
  /** 4-6 items to be arranged oldest-to-newest by `date`. */
  items: z.array(TimelineItemSchema).min(4).max(6),
});
export type TimelinePuzzle = z.infer<typeof TimelinePuzzleSchema>;

// --- Mode dispatch (replaces the former discriminated union) -------------

/**
 * Returns the Zod schema for a given mode.
 *
 * The content model deliberately avoids a top-level `z.discriminatedUnion`:
 * each puzzle is validated against its own concrete schema, selected by the
 * `mode` field. This keeps the validation path explicit and avoids the
 * cross-mode type narrowing a union would impose on consumers.
 */
export function schemaForMode(mode: Mode) {
  switch (mode) {
    case "keywords":
      return KeywordsPuzzleSchema;
    case "emoji":
      return EmojiPuzzleSchema;
    case "screenshot":
      return ScreenshotPuzzleSchema;
    case "timeline":
      return TimelinePuzzleSchema;
  }
}

/**
 * Parses an unknown JSON value as a puzzle, dispatching on its `mode` field.
 * Returns `{ success, data }` like a Zod `safeParse`.
 */
export function parsePuzzle(json: unknown):
  | { success: true; data: Puzzle }
  | { success: false; error: import("zod").ZodError } {
  const modeResult = ModeEnum.safeParse(
    (json as { mode?: unknown } | null)?.mode,
  );
  if (!modeResult.success) {
    return {
      success: false,
      error: modeResult.error,
    };
  }
  return schemaForMode(modeResult.data).safeParse(json) as
    | { success: true; data: Puzzle }
    | { success: false; error: import("zod").ZodError };
}

/** Union of all puzzle types (type-level only — no runtime Zod union). */
export type Puzzle =
  | KeywordsPuzzle
  | EmojiPuzzle
  | ScreenshotPuzzle
  | TimelinePuzzle;

// --- Lightweight index row ----------------------------------------------

export const PuzzleIndexRowSchema = z.object({
  id: PuzzleIdSchema,
  mode: ModeEnum,
  domain: DomainEnum,
});
export type PuzzleIndexRow = z.infer<typeof PuzzleIndexRowSchema>;

// --- Mode → directory + ID prefix maps -----------------------------------

export const MODE_DIRECTORIES = [
  "keywords",
  "emoji",
  "screenshot",
  "timeline",
] as const satisfies ReadonlyArray<Mode>;

/** Maps a puzzle ID prefix to its mode directory name. */
export const PREFIX_TO_MODE: Record<string, Mode> = {
  kw: "keywords",
  em: "emoji",
  ss: "screenshot",
  tl: "timeline",
};

/** Maps a mode to its expected ID prefix. */
export const MODE_TO_PREFIX: Record<Mode, string> = {
  keywords: "kw",
  emoji: "em",
  screenshot: "ss",
  timeline: "tl",
};
