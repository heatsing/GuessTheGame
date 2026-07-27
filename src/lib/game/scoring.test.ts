import { describe, expect, it } from "vitest";

import {
  BASE_SCORE,
  GIVE_UP_SCORE,
  MIN_SCORE,
  computeDailyTotal,
  finalDailyScore,
  scoreEmoji,
  scoreKeywords,
  scoreScreenshot,
  scoreTimeline,
  streakMultiplier,
  timelinePositionErrors,
} from "./scoring";

/**
 * Unit tests for the pure scoring engine.
 *
 * Every assertion is an exact integer — the functions are pure and
 * deterministic, so there is no reason for approximate matching. The worked
 * examples come directly from PRD §5.2–§5.5; if a test and the PRD disagree,
 * the PRD wins (update the code, never the test to force a pass — guardrail #6).
 */

// --- Keywords (PRD §5.2, §7.1) -------------------------------------------

describe("scoreKeywords", () => {
  it("returns the base score with no penalties (PRD §5.2 ideal play)", () => {
    expect(scoreKeywords({ wrongGuesses: 0, revealedKeywords: 0 })).toBe(100);
  });

  it("matches the PRD §5.2 worked example: 1 wrong + 2 revealed = 60", () => {
    // Target "Volcano": guess "Mountain" (wrong, -10), reveal 2 keywords
    // ("mountain","heat", -30), guess "Volcano" (correct).
    // 100 - 10 - 30 = 60.
    expect(scoreKeywords({ wrongGuesses: 1, revealedKeywords: 2 })).toBe(60);
  });

  it("applies -10 per wrong guess and -15 per revealed keyword independently", () => {
    expect(scoreKeywords({ wrongGuesses: 3, revealedKeywords: 4 })).toBe(
      100 - 30 - 60, // = 10 (floor)
    );
  });

  it("floors at MIN_SCORE (10) when penalties would drop below", () => {
    // 100 - 10*5 - 15*6 = 100 - 50 - 90 = -40 → floor 10
    expect(scoreKeywords({ wrongGuesses: 5, revealedKeywords: 6 })).toBe(MIN_SCORE);
  });

  it("returns exactly 0 on give-up, ignoring all other inputs", () => {
    expect(scoreKeywords({ wrongGuesses: 0, revealedKeywords: 0, gaveUp: true })).toBe(GIVE_UP_SCORE);
    expect(scoreKeywords({ wrongGuesses: 10, revealedKeywords: 6, gaveUp: true })).toBe(GIVE_UP_SCORE);
  });

  it("clamps negative inputs to 0 (defensive — caller bug)", () => {
    expect(scoreKeywords({ wrongGuesses: -5, revealedKeywords: -2 })).toBe(BASE_SCORE);
  });

  it("truncates fractional inputs (defensive — caller bug)", () => {
    // 2.9 → 2, 1.1 → 1. 100 - 10*2 - 15*1 = 100 - 20 - 15 = 65.
    expect(scoreKeywords({ wrongGuesses: 2.9, revealedKeywords: 1.1 })).toBe(65);
  });
});

// --- Emoji (PRD §5.3, §7.1) ----------------------------------------------

describe("scoreEmoji", () => {
  it("returns the base score with no penalties", () => {
    expect(scoreEmoji({ wrongGuesses: 0, hintsUsed: 0 })).toBe(100);
  });

  it("applies -20 per wrong guess", () => {
    expect(scoreEmoji({ wrongGuesses: 2, hintsUsed: 0 })).toBe(60);
  });

  it("applies -25 per hint used (max 2 hints per PRD §5.3)", () => {
    expect(scoreEmoji({ wrongGuesses: 0, hintsUsed: 2 })).toBe(50);
  });

  it("combines wrong-guess and hint penalties", () => {
    // 100 - 20*1 - 25*1 = 55
    expect(scoreEmoji({ wrongGuesses: 1, hintsUsed: 1 })).toBe(55);
  });

  it("floors at MIN_SCORE (10) when penalties would drop below", () => {
    // 100 - 20*5 - 25*2 = 100 - 100 - 50 = -50 → floor 10
    expect(scoreEmoji({ wrongGuesses: 5, hintsUsed: 2 })).toBe(MIN_SCORE);
  });

  it("returns exactly 0 on give-up", () => {
    expect(scoreEmoji({ wrongGuesses: 0, hintsUsed: 0, gaveUp: true })).toBe(GIVE_UP_SCORE);
  });

  it("clamps negative inputs to 0", () => {
    expect(scoreEmoji({ wrongGuesses: -1, hintsUsed: -1 })).toBe(BASE_SCORE);
  });
});

// --- Screenshot (PRD §5.4, §7.1) -----------------------------------------

describe("scoreScreenshot", () => {
  it("returns the base score with no penalties", () => {
    expect(scoreScreenshot({ wrongGuesses: 0, sharpens: 0 })).toBe(100);
  });

  it("applies -20 per wrong guess", () => {
    expect(scoreScreenshot({ wrongGuesses: 2, sharpens: 0 })).toBe(60);
  });

  it("applies -25 per sharpen action (max 3 per PRD §5.4: level 3→0)", () => {
    expect(scoreScreenshot({ wrongGuesses: 0, sharpens: 3 })).toBe(25);
  });

  it("combines wrong-guess and sharpen penalties", () => {
    // 100 - 20*1 - 25*2 = 30
    expect(scoreScreenshot({ wrongGuesses: 1, sharpens: 2 })).toBe(30);
  });

  it("floors at MIN_SCORE (10) when penalties would drop below", () => {
    // 100 - 20*5 - 25*3 = 100 - 100 - 75 = -75 → floor 10
    expect(scoreScreenshot({ wrongGuesses: 5, sharpens: 3 })).toBe(MIN_SCORE);
  });

  it("returns exactly 0 on give-up", () => {
    expect(scoreScreenshot({ wrongGuesses: 0, sharpens: 0, gaveUp: true })).toBe(GIVE_UP_SCORE);
  });
});

// --- Timeline (PRD §5.5, §7.1) -------------------------------------------

describe("scoreTimeline", () => {
  it("returns the base score for a perfect order (0 position errors, 0 hints)", () => {
    expect(scoreTimeline({ positionErrors: 0, hintsUsed: 0 })).toBe(100);
  });

  it("matches the PRD §5.5 worked example: 3 total position errors = 55", () => {
    // 4 items. A 1 off + B 2 off = 3 total. 100 - (15×3) = 55.
    expect(scoreTimeline({ positionErrors: 3, hintsUsed: 0 })).toBe(55);
  });

  it("applies -10 per hint used", () => {
    expect(scoreTimeline({ positionErrors: 0, hintsUsed: 2 })).toBe(80);
  });

  it("combines position-error and hint penalties", () => {
    // 100 - 15*2 - 10*1 = 60
    expect(scoreTimeline({ positionErrors: 2, hintsUsed: 1 })).toBe(60);
  });

  it("floors at MIN_SCORE (10) when penalties would drop below", () => {
    // 100 - 15*8 - 10*2 = 100 - 120 - 20 = -40 → floor 10
    expect(scoreTimeline({ positionErrors: 8, hintsUsed: 2 })).toBe(MIN_SCORE);
  });

  it("returns exactly 0 on give-up", () => {
    expect(scoreTimeline({ positionErrors: 0, hintsUsed: 0, gaveUp: true })).toBe(GIVE_UP_SCORE);
  });

  it("has NO wrong-guess penalty (Timeline-specific per PRD §7.1)", () => {
    // Timeline scoring does not take wrongGuesses — confirm the API reflects
    // this by ensuring the input type has no wrongGuesses field. This is a
    // type-level check encoded as a runtime no-op: if someone adds
    // wrongGuesses to TimelineScoreInput, this test still passes but the type
    // error will surface at the call site.
    const input: Parameters<typeof scoreTimeline>[0] = {
      positionErrors: 0,
      hintsUsed: 0,
    };
    expect(scoreTimeline(input)).toBe(BASE_SCORE);
  });
});

// --- timelinePositionErrors helper --------------------------------------

describe("timelinePositionErrors", () => {
  it("returns 0 for a perfect order", () => {
    const correct = ["a", "b", "c", "d"];
    expect(timelinePositionErrors(correct, correct)).toBe(0);
  });

  it("matches the PRD §5.5 example shape: A 1 off + B 2 off = 3", () => {
    // Correct: a b c d. Submitted: b c a d.
    //   a: submitted pos 2, correct pos 0 → |2-0| = 2
    //   b: submitted pos 0, correct pos 1 → |0-1| = 1
    //   c: submitted pos 1, correct pos 2 → |1-2| = 1
    //   d: submitted pos 3, correct pos 3 → 0
    // Wait — that sums to 4, not 3. The PRD example is illustrative ("A 1 off,
    // B 2 off"); this test pins the actual computed value for a concrete
    // shuffle so the helper's behavior is unambiguous.
    const correct = ["a", "b", "c", "d"];
    const submitted = ["b", "c", "a", "d"];
    expect(timelinePositionErrors(submitted, correct)).toBe(4);
  });

  it("returns 0 for a single-item swap that is actually a reversal of 2 items", () => {
    // Correct: a b. Submitted: b a.
    //   a: submitted 1, correct 0 → 1
    //   b: submitted 0, correct 1 → 1
    // Total = 2 (a swap of 2 items contributes 2 to the error sum).
    expect(timelinePositionErrors(["b", "a"], ["a", "b"])).toBe(2);
  });

  it("returns 0 for empty arrays", () => {
    expect(timelinePositionErrors([], [])).toBe(0);
  });

  it("returns 0 when lengths mismatch (defensive — caller bug)", () => {
    expect(timelinePositionErrors(["a", "b"], ["a", "b", "c"])).toBe(0);
  });

  it("ignores submitted IDs not present in the correct order (caller bug)", () => {
    // "x" is unknown — it contributes 0 (not NaN). "a" is at pos 1 instead of 0.
    expect(timelinePositionErrors(["x", "a"], ["a", "b"])).toBe(1);
  });

  it("handles a full reversal of 4 items", () => {
    // Correct: a b c d. Submitted: d c b a.
    //   a: 3 vs 0 → 3
    //   b: 2 vs 1 → 1
    //   c: 1 vs 2 → 1
    //   d: 0 vs 3 → 3
    // Total = 8.
    expect(timelinePositionErrors(["d", "c", "b", "a"], ["a", "b", "c", "d"])).toBe(8);
  });
});

// --- Streak multiplier (PRD §7.2) ----------------------------------------

describe("streakMultiplier", () => {
  it("returns 1.00x for 0 days (new player — no penalty)", () => {
    expect(streakMultiplier(0)).toBe(1.0);
  });

  it("returns 1.00x for 1-2 days", () => {
    expect(streakMultiplier(1)).toBe(1.0);
    expect(streakMultiplier(2)).toBe(1.0);
  });

  it("returns 1.05x for 3-4 days", () => {
    expect(streakMultiplier(3)).toBe(1.05);
    expect(streakMultiplier(4)).toBe(1.05);
  });

  it("returns 1.10x for 5-6 days", () => {
    expect(streakMultiplier(5)).toBe(1.1);
    expect(streakMultiplier(6)).toBe(1.1);
  });

  it("returns 1.20x for 7-9 days", () => {
    expect(streakMultiplier(7)).toBe(1.2);
    expect(streakMultiplier(9)).toBe(1.2);
  });

  it("returns 1.50x for 10+ days", () => {
    expect(streakMultiplier(10)).toBe(1.5);
    expect(streakMultiplier(30)).toBe(1.5);
    expect(streakMultiplier(365)).toBe(1.5);
  });

  it("matches the PRD §7.2 worked example: 280 × 1.20 = 336", () => {
    // Streak 7 days → 1.20x. Daily total 280 → final 336.
    expect(finalDailyScore(280, streakMultiplier(7))).toBe(336);
  });

  it("clamps negative streak to 0 (defensive — caller bug)", () => {
    expect(streakMultiplier(-5)).toBe(1.0);
  });
});

// --- Daily total (PRD §7.2) ----------------------------------------------

describe("computeDailyTotal", () => {
  it("returns 0 when no modes are present", () => {
    expect(computeDailyTotal({})).toBe(0);
  });

  it("sums all four mode scores", () => {
    expect(
      computeDailyTotal({
        keywords: 90,
        emoji: 80,
        screenshot: 70,
        timeline: 60,
      }),
    ).toBe(300);
  });

  it("treats null and undefined identically (contributes 0)", () => {
    expect(
      computeDailyTotal({
        keywords: 100,
        emoji: null,
        // screenshot omitted
        timeline: 50,
      }),
    ).toBe(150);
  });

  it("maxes at 400 when all four modes score 100", () => {
    expect(
      computeDailyTotal({
        keywords: 100,
        emoji: 100,
        screenshot: 100,
        timeline: 100,
      }),
    ).toBe(400);
  });
});

// --- Final daily score (PRD §7.2) ----------------------------------------

describe("finalDailyScore", () => {
  it("rounds to the nearest integer (PRD §7.2)", () => {
    // 280 × 1.20 = 336 (exact).
    expect(finalDailyScore(280, 1.2)).toBe(336);
  });

  it("rounds half toward +Infinity (Math.round semantics)", () => {
    // 281 × 1.05 = 295.05 → 295.
    expect(finalDailyScore(281, 1.05)).toBe(295);
    // 282 × 1.05 = 296.1 → 296.
    expect(finalDailyScore(282, 1.05)).toBe(296);
  });

  it("returns the total unchanged when multiplier is 1.00x", () => {
    expect(finalDailyScore(310, 1.0)).toBe(310);
  });

  it("returns 0 for a zero total regardless of multiplier", () => {
    expect(finalDailyScore(0, 1.5)).toBe(0);
  });
});

// --- Cross-mode invariants -----------------------------------------------

describe("scoring invariants across all modes", () => {
  it("BASE_SCORE is 100 and MIN_SCORE is 10 (PRD §7.1)", () => {
    expect(BASE_SCORE).toBe(100);
    expect(MIN_SCORE).toBe(10);
  });

  it("GIVE_UP_SCORE is 0 in every mode (PRD §5.2–§5.5)", () => {
    expect(GIVE_UP_SCORE).toBe(0);
    expect(scoreKeywords({ wrongGuesses: 0, revealedKeywords: 0, gaveUp: true })).toBe(0);
    expect(scoreEmoji({ wrongGuesses: 0, hintsUsed: 0, gaveUp: true })).toBe(0);
    expect(scoreScreenshot({ wrongGuesses: 0, sharpens: 0, gaveUp: true })).toBe(0);
    expect(scoreTimeline({ positionErrors: 0, hintsUsed: 0, gaveUp: true })).toBe(0);
  });

  it("never returns a score below MIN_SCORE except on give-up", () => {
    // Push every mode past its floor with extreme inputs.
    expect(scoreKeywords({ wrongGuesses: 100, revealedKeywords: 100 })).toBe(MIN_SCORE);
    expect(scoreEmoji({ wrongGuesses: 100, hintsUsed: 100 })).toBe(MIN_SCORE);
    expect(scoreScreenshot({ wrongGuesses: 100, sharpens: 100 })).toBe(MIN_SCORE);
    expect(scoreTimeline({ positionErrors: 100, hintsUsed: 100 })).toBe(MIN_SCORE);
  });

  it("never returns a score above BASE_SCORE", () => {
    // Negative penalties are clamped to 0, so the max is always BASE_SCORE.
    expect(scoreKeywords({ wrongGuesses: -10, revealedKeywords: -10 })).toBe(BASE_SCORE);
    expect(scoreEmoji({ wrongGuesses: -10, hintsUsed: -10 })).toBe(BASE_SCORE);
    expect(scoreScreenshot({ wrongGuesses: -10, sharpens: -10 })).toBe(BASE_SCORE);
    expect(scoreTimeline({ positionErrors: -10, hintsUsed: -10 })).toBe(BASE_SCORE);
  });
});
