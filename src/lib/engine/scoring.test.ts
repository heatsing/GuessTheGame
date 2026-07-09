import { describe, it, expect } from "vitest";
import {
  calculateKeywordsScore,
  calculateEmojiScore,
  calculateScreenshotScore,
  calculateTimelineScore,
  calculateDailyTotal,
  getStreakMultiplier,
  calculateFinalScore,
  calculatePositionErrors,
} from "./scoring";

describe("calculateKeywordsScore", () => {
  it("returns 100 for no reveals and no wrong guesses", () => {
    expect(calculateKeywordsScore(0, 0)).toBe(100);
  });

  it("deducts 15 per revealed keyword", () => {
    expect(calculateKeywordsScore(2, 0)).toBe(70);
  });

  it("deducts 10 per wrong guess", () => {
    expect(calculateKeywordsScore(0, 3)).toBe(70);
  });

  it("floors at 10", () => {
    expect(calculateKeywordsScore(6, 5)).toBe(10);
    expect(calculateKeywordsScore(10, 10)).toBe(10);
  });

  it("returns 0 when given up", () => {
    expect(calculateKeywordsScore(0, 0, true)).toBe(0);
  });
});

describe("calculateEmojiScore", () => {
  it("returns 100 for perfect", () => {
    expect(calculateEmojiScore(0, 0)).toBe(100);
  });

  it("deducts 20 per wrong and 25 per hint", () => {
    expect(calculateEmojiScore(2, 1)).toBe(35);
  });

  it("floors at 10", () => {
    expect(calculateEmojiScore(5, 2)).toBe(10);
  });

  it("returns 0 when given up", () => {
    expect(calculateEmojiScore(0, 0, true)).toBe(0);
  });
});

describe("calculateScreenshotScore", () => {
  it("returns 100 for perfect", () => {
    expect(calculateScreenshotScore(0, 0)).toBe(100);
  });

  it("deducts 20 per wrong and 25 per sharpen", () => {
    expect(calculateScreenshotScore(1, 2)).toBe(30);
  });

  it("floors at 10", () => {
    expect(calculateScreenshotScore(5, 3)).toBe(10);
  });
});

describe("calculateTimelineScore", () => {
  it("returns 100 for zero errors", () => {
    expect(calculateTimelineScore(0, 0)).toBe(100);
  });

  it("deducts 15 per position error and 10 per hint", () => {
    expect(calculateTimelineScore(3, 1)).toBe(45);
  });

  it("floors at 10", () => {
    expect(calculateTimelineScore(10, 2)).toBe(10);
  });
});

describe("calculateDailyTotal", () => {
  it("sums all scores", () => {
    expect(calculateDailyTotal([100, 80, 60, 40])).toBe(280);
  });

  it("handles zeros", () => {
    expect(calculateDailyTotal([0, 0, 0, 0])).toBe(0);
  });
});

describe("getStreakMultiplier", () => {
  it("returns 1.0 for 1-2 days", () => {
    expect(getStreakMultiplier(1)).toBe(1.0);
    expect(getStreakMultiplier(2)).toBe(1.0);
  });

  it("returns 1.05 for 3-4 days", () => {
    expect(getStreakMultiplier(3)).toBe(1.05);
    expect(getStreakMultiplier(4)).toBe(1.05);
  });

  it("returns 1.10 for 5-6 days", () => {
    expect(getStreakMultiplier(5)).toBe(1.10);
    expect(getStreakMultiplier(6)).toBe(1.10);
  });

  it("returns 1.20 for 7-9 days", () => {
    expect(getStreakMultiplier(7)).toBe(1.20);
    expect(getStreakMultiplier(9)).toBe(1.20);
  });

  it("returns 1.50 for 10+ days", () => {
    expect(getStreakMultiplier(10)).toBe(1.50);
    expect(getStreakMultiplier(100)).toBe(1.50);
  });

  it("returns 1.0 for 0 days", () => {
    expect(getStreakMultiplier(0)).toBe(1.0);
  });
});

describe("calculateFinalScore", () => {
  it("multiplies and rounds", () => {
    expect(calculateFinalScore(280, 1.20)).toBe(336);
    expect(calculateFinalScore(100, 1.05)).toBe(105);
    expect(calculateFinalScore(150, 1.10)).toBe(165);
  });
});

describe("calculatePositionErrors", () => {
  it("returns 0 for correct order", () => {
    expect(calculatePositionErrors(["a", "b", "c"], ["a", "b", "c"])).toBe(0);
  });

  it("calculates total displacement", () => {
    // submitted: [b, a, c, d], correct: [a, b, c, d]
    // b is at pos 0, should be at pos 1 → error 1
    // a is at pos 1, should be at pos 0 → error 1
    // total = 2
    expect(calculatePositionErrors(["b", "a", "c", "d"], ["a", "b", "c", "d"])).toBe(2);
  });

  it("handles fully reversed", () => {
    // submitted: [d, c, b, a], correct: [a, b, c, d]
    // d: pos 0 → should be 3 → error 3
    // c: pos 1 → should be 2 → error 1
    // b: pos 2 → should be 1 → error 1
    // a: pos 3 → should be 0 → error 3
    // total = 8
    expect(calculatePositionErrors(["d", "c", "b", "a"], ["a", "b", "c", "d"])).toBe(8);
  });

  it("ignores items not in correct array", () => {
    // "a" at pos 0, correct pos 0 → 0
    // "x" not in correct → skip
    // "b" at pos 2, correct pos 1 → 1
    expect(calculatePositionErrors(["a", "x", "b"], ["a", "b", "c"])).toBe(1);
  });
});
