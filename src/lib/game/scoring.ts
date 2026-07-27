/**
 * Pure per-puzzle scoring functions for all four game modes.
 *
 * Source of truth: `docs/PRD.md` §7.1 (Per-Puzzle Scoring Summary) and
 * §5.2–§5.5 (per-mode rules + worked examples).
 *
 * Design rules (enforced in every function):
 *  - Pure: no I/O, no side effects, no `Date`/`Math.random` — fully deterministic
 *    from inputs, so unit tests are exact.
 *  - Floor of 10 points on any non-give-up outcome (PRD §5.2–§5.5 "Minimum
 *    score: 10"). Give-up returns exactly 0.
 *  - Inputs are clamped defensively: negative counts are treated as 0, fractional
 *    counts are truncated. A caller bug cannot produce a nonsense score.
 *  - No `any` (guardrail #5): inputs are typed; the union return narrows on
 *    `gaveUp`.
 *
 * These functions are consumed by the game client components (Phase 4d slices
 * 4d-3..4d-6) and by `scoring.test.ts`. They do NOT touch storage — the caller
 * passes the result score into `recordModeResult`.
 */

// --- Shared constants (PRD §7.1) -----------------------------------------

/** Base score every mode starts from. */
export const BASE_SCORE = 100;
/** Minimum score for any non-give-up outcome. Give-up is always 0. */
export const MIN_SCORE = 10;
/** Score returned when the player gives up. */
export const GIVE_UP_SCORE = 0;

// --- Keywords (PRD §5.2, §7.1) -------------------------------------------
// Base 100, -10/wrong guess, -15/keyword revealed, floor 10, give-up 0.

const KEYWORDS_WRONG_PENALTY = 10;
const KEYWORDS_REVEAL_PENALTY = 15;

export interface KeywordsScoreInput {
  /** Number of wrong guesses submitted (case-insensitive duplicates excluded). */
  wrongGuesses: number;
  /** Number of keyword clues revealed (0–6 per PRD §5.2). */
  revealedKeywords: number;
  /** True when the player pressed "Give up". */
  gaveUp?: boolean;
}

export function scoreKeywords(input: KeywordsScoreInput): number {
  if (input.gaveUp) return GIVE_UP_SCORE;
  const wrong = clampNonNegativeInt(input.wrongGuesses);
  const revealed = clampNonNegativeInt(input.revealedKeywords);
  const raw = BASE_SCORE
    - KEYWORDS_WRONG_PENALTY * wrong
    - KEYWORDS_REVEAL_PENALTY * revealed;
  return Math.max(MIN_SCORE, raw);
}

// --- Emoji (PRD §5.3, §7.1) ----------------------------------------------
// Base 100, -20/wrong guess, -25/hint used, floor 10, give-up 0.

const EMOJI_WRONG_PENALTY = 20;
const EMOJI_HINT_PENALTY = 25;

export interface EmojiScoreInput {
  /** Number of wrong guesses submitted. */
  wrongGuesses: number;
  /** Number of hints used (0–2: category + firstLetter per PRD §5.3). */
  hintsUsed: number;
  /** True when the player pressed "Give up". */
  gaveUp?: boolean;
}

export function scoreEmoji(input: EmojiScoreInput): number {
  if (input.gaveUp) return GIVE_UP_SCORE;
  const wrong = clampNonNegativeInt(input.wrongGuesses);
  const hints = clampNonNegativeInt(input.hintsUsed);
  const raw = BASE_SCORE
    - EMOJI_WRONG_PENALTY * wrong
    - EMOJI_HINT_PENALTY * hints;
  return Math.max(MIN_SCORE, raw);
}

// --- Screenshot (PRD §5.4, §7.1) -----------------------------------------
// Base 100, -20/wrong guess, -25/sharpen level, floor 10, give-up 0.
// Sharpen count = number of blur reductions (0–3: level 3→2→1→0 per §5.4).

const SCREENSHOT_WRONG_PENALTY = 20;
const SCREENSHOT_SHARPEN_PENALTY = 25;

export interface ScreenshotScoreInput {
  /** Number of wrong guesses submitted. */
  wrongGuesses: number;
  /** Number of sharpen actions taken (0–3 per PRD §5.4). */
  sharpens: number;
  /** True when the player pressed "Give up". */
  gaveUp?: boolean;
}

export function scoreScreenshot(input: ScreenshotScoreInput): number {
  if (input.gaveUp) return GIVE_UP_SCORE;
  const wrong = clampNonNegativeInt(input.wrongGuesses);
  const sharpens = clampNonNegativeInt(input.sharpens);
  const raw = BASE_SCORE
    - SCREENSHOT_WRONG_PENALTY * wrong
    - SCREENSHOT_SHARPEN_PENALTY * sharpens;
  return Math.max(MIN_SCORE, raw);
}

// --- Timeline (PRD §5.5, §7.1) -------------------------------------------
// Base 100, NO wrong-guess penalty, -10/hint, -15 × (sum of position errors),
// floor 10, give-up 0.
//
// A "position error" for an item is the absolute distance between its submitted
// position and its correct chronological position. Summed across all items.
// Per PRD §5.5 example: A 1 off + B 2 off = 3 total → 100 - (15×3) = 55.

const TIMELINE_HINT_PENALTY = 10;
const TIMELINE_POSITION_ERROR_PENALTY = 15;

export interface TimelineScoreInput {
  /**
   * Total position error = sum of |submittedPosition - correctPosition| across
   * all items. The caller computes this from the submitted order vs. the
   * sorted-by-date order.
   */
  positionErrors: number;
  /** Number of hints used (0–2 per PRD §5.5). */
  hintsUsed: number;
  /** True when the player pressed "Give up". */
  gaveUp?: boolean;
}

export function scoreTimeline(input: TimelineScoreInput): number {
  if (input.gaveUp) return GIVE_UP_SCORE;
  const errors = clampNonNegativeInt(input.positionErrors);
  const hints = clampNonNegativeInt(input.hintsUsed);
  const raw = BASE_SCORE
    - TIMELINE_POSITION_ERROR_PENALTY * errors
    - TIMELINE_HINT_PENALTY * hints;
  return Math.max(MIN_SCORE, raw);
}

// --- Shared helper -------------------------------------------------------

/**
 * Clamps to a non-negative integer. Negative inputs → 0; fractional inputs →
 * truncated. This is a defensive measure so a caller passing `-1` or `2.7`
 * cannot produce a nonsense score; it does NOT validate semantic bounds
 * (e.g. revealedKeywords > 6 is the caller's bug to prevent at the UI layer).
 */
function clampNonNegativeInt(value: number): number {
  if (!Number.isFinite(value) || value < 0) return 0;
  return Math.trunc(value);
}

// --- Position-error helper (used by TimelineGame, slice 4d-6) ------------

/**
 * Computes the total position error for a Timeline submission.
 *
 * Given the submitted order and the correct (chronological) order, returns the
 * sum of absolute position differences for each item. An item in its correct
 * spot contributes 0; an item N spots away contributes N.
 *
 * Pure and deterministic — used by `scoreTimeline` indirectly and directly
 * testable. Exported so the Timeline game component (slice 4d-6) can show
 * per-item feedback without duplicating the math (guardrail #4).
 *
 * @param submittedOrder Item IDs in the order the player placed them.
 * @param correctOrder   Item IDs in chronological order (oldest first).
 * @returns Sum of |submittedPos - correctPos| across all items. 0 means a
 *          perfect order. Returns 0 for empty/equal-length-mismatch safely.
 */
export function timelinePositionErrors(
  submittedOrder: string[],
  correctOrder: string[],
): number {
  if (submittedOrder.length === 0 || correctOrder.length === 0) return 0;
  if (submittedOrder.length !== correctOrder.length) return 0;

  const correctIndex = new Map<string, number>();
  correctOrder.forEach((id, i) => correctIndex.set(id, i));

  let total = 0;
  submittedOrder.forEach((id, submittedPos) => {
    const correctPos = correctIndex.get(id);
    if (correctPos === undefined) return; // unknown id — ignore (caller bug)
    total += Math.abs(submittedPos - correctPos);
  });
  return total;
}

// --- Daily total + streak multiplier (PRD §7.2) ---------------------------

/**
 * Streak multiplier table (PRD §7.2).
 *
 * | Streak (days) | Multiplier |
 * |---------------|-----------|
 * | 1-2           | 1.00x     |
 * | 3-4           | 1.05x     |
 * | 5-6           | 1.10x     |
 * | 7-9           | 1.20x     |
 * | 10+           | 1.50x     |
 *
 * A streak of 0 (no activity yet) maps to 1.00x — there is no penalty for
 * being new; the multiplier only rewards consistency. Negative inputs are
 * clamped to 0 (defensive — caller bug).
 */
export function streakMultiplier(streakDays: number): number {
  const days = clampNonNegativeInt(streakDays);
  if (days >= 10) return 1.5;
  if (days >= 7) return 1.2;
  if (days >= 5) return 1.1;
  if (days >= 3) return 1.05;
  return 1.0;
}

/**
 * Input shape for `computeDailyTotal` — the four mode scores for a single
 * UTC day. Each is optional; absent/null modes contribute 0. Structurally
 * compatible with both `DailyProgress` (storage) and a flat scores object
 * (UI), so both can call it without adaptation.
 */
export interface DailyTotalInput {
  keywords?: number | null;
  emoji?: number | null;
  screenshot?: number | null;
  timeline?: number | null;
}

/**
 * Sums the four mode scores for a single day (PRD §7.2: "Daily total = sum
 * of 4 puzzle scores, 0-400 range"). Absent/null scores contribute 0.
 */
export function computeDailyTotal(input: DailyTotalInput): number {
  let total = 0;
  if (input.keywords != null) total += input.keywords;
  if (input.emoji != null) total += input.emoji;
  if (input.screenshot != null) total += input.screenshot;
  if (input.timeline != null) total += input.timeline;
  return total;
}

/**
 * Final daily score = round(dailyTotal × multiplier) (PRD §7.2).
 *
 * Uses `Math.round` (round half toward +∞) to match the PRD example:
 * 280 × 1.20 = 336.
 */
export function finalDailyScore(dailyTotal: number, multiplier: number): number {
  return Math.round(dailyTotal * multiplier);
}
