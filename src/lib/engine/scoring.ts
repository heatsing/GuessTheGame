/**
 * Scoring functions — implements PRD §7 scoring rules.
 * All functions are pure.
 */

const MIN_SCORE = 10;
const MAX_SCORE = 100;

function clampScore(score: number): number {
  return Math.max(0, Math.min(MAX_SCORE, Math.round(score)));
}

/** Keywords: 100 - 15*revealed - 10*wrong, min 10, give up = 0 */
export function calculateKeywordsScore(
  revealedCount: number,
  wrongCount: number,
  givenUp: boolean = false
): number {
  if (givenUp) return 0;
  const score = MAX_SCORE - 15 * revealedCount - 10 * wrongCount;
  return Math.max(MIN_SCORE, clampScore(score));
}

/** Emoji: 100 - 20*wrong - 25*hints, min 10, give up = 0 */
export function calculateEmojiScore(
  wrongCount: number,
  hintCount: number,
  givenUp: boolean = false
): number {
  if (givenUp) return 0;
  const score = MAX_SCORE - 20 * wrongCount - 25 * hintCount;
  return Math.max(MIN_SCORE, clampScore(score));
}

/** Screenshot: 100 - 20*wrong - 25*sharpens, min 10, give up = 0 */
export function calculateScreenshotScore(
  wrongCount: number,
  sharpenCount: number,
  givenUp: boolean = false
): number {
  if (givenUp) return 0;
  const score = MAX_SCORE - 20 * wrongCount - 25 * sharpenCount;
  return Math.max(MIN_SCORE, clampScore(score));
}

/** Timeline: 100 - 15*positionErrors - 10*hints, min 10, give up = 0 */
export function calculateTimelineScore(
  positionErrors: number,
  hintCount: number,
  givenUp: boolean = false
): number {
  if (givenUp) return 0;
  const score = MAX_SCORE - 15 * positionErrors - 10 * hintCount;
  return Math.max(MIN_SCORE, clampScore(score));
}

/** Daily total = sum of 4 puzzle scores (0-400) */
export function calculateDailyTotal(scores: number[]): number {
  return scores.reduce((sum, s) => sum + s, 0);
}

/** Streak multiplier — PRD §7.2 */
export function getStreakMultiplier(streakDays: number): number {
  if (streakDays >= 10) return 1.50;
  if (streakDays >= 7) return 1.20;
  if (streakDays >= 5) return 1.10;
  if (streakDays >= 3) return 1.05;
  return 1.00;
}

/** Final daily score = round(total * multiplier) */
export function calculateFinalScore(dailyTotal: number, multiplier: number): number {
  return Math.round(dailyTotal * multiplier);
}

/**
 * Calculate total position errors for Timeline.
 * Each item's error = |submitted position - correct position|.
 * Total = sum of all individual errors.
 */
export function calculatePositionErrors(submitted: string[], correct: string[]): number {
  let totalErrors = 0;
  for (let i = 0; i < submitted.length; i++) {
    const itemId = submitted[i]!;
    const correctPos = correct.indexOf(itemId);
    if (correctPos === -1) continue;
    totalErrors += Math.abs(i - correctPos);
  }
  return totalErrors;
}
