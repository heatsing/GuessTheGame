import {
  acceptedAnswers,
  isCorrectGuess,
  isDuplicateGuess,
  normalizeAnswer,
  wrongGuessesOnly,
} from "@/lib/game/match";

describe("normalizeAnswer", () => {
  it("lowercases", () => {
    expect(normalizeAnswer("Volcano")).toBe("volcano");
  });

  it("trims leading/trailing whitespace", () => {
    expect(normalizeAnswer("  volcano  ")).toBe("volcano");
  });

  it("collapses internal whitespace runs to a single space", () => {
    expect(normalizeAnswer("Mount   Everest")).toBe("mount everest");
    expect(normalizeAnswer("a\t\tb\n c")).toBe("a b c");
  });

  it("handles empty and whitespace-only input", () => {
    expect(normalizeAnswer("")).toBe("");
    expect(normalizeAnswer("   ")).toBe("");
    expect(normalizeAnswer("\t\n")).toBe("");
  });

  it("coerces non-string input to string", () => {
    expect(normalizeAnswer(42 as unknown as string)).toBe("42");
  });

  it("preserves unicode characters", () => {
    expect(normalizeAnswer("São Paulo")).toBe("são paulo");
    expect(normalizeAnswer("東京")).toBe("東京");
  });
});

describe("acceptedAnswers", () => {
  it("includes target and all aliases, normalized", () => {
    expect(
      acceptedAnswers("Mount Everest", ["everest", "Mt. Everest"]),
    ).toEqual(["mount everest", "everest", "mt. everest"]);
  });

  it("de-duplicates aliases that normalize to the same value", () => {
    expect(acceptedAnswers("Volcano", ["volcano", "VOLCANO", "  volcano "])).toEqual([
      "volcano",
    ]);
  });

  it("defaults aliases to empty array", () => {
    expect(acceptedAnswers("Compass")).toEqual(["compass"]);
  });
});

describe("isCorrectGuess", () => {
  const puzzle = { target: "Mount Everest", aliases: ["everest", "mt. everest"] };

  it("matches the target case- and whitespace-insensitively", () => {
    expect(isCorrectGuess("mount everest", puzzle)).toBe(true);
    expect(isCorrectGuess("  Mount   EVEREST ", puzzle)).toBe(true);
  });

  it("matches any alias", () => {
    expect(isCorrectGuess("everest", puzzle)).toBe(true);
    expect(isCorrectGuess("Mt. Everest", puzzle)).toBe(true);
  });

  it("returns false for a wrong guess", () => {
    expect(isCorrectGuess("k2", puzzle)).toBe(false);
    expect(isCorrectGuess("mount", puzzle)).toBe(false);
  });

  it("never matches empty/whitespace input (no accidental wins)", () => {
    expect(isCorrectGuess("", puzzle)).toBe(false);
    expect(isCorrectGuess("   ", puzzle)).toBe(false);
  });
});

describe("isDuplicateGuess", () => {
  it("detects a repeat regardless of case/whitespace", () => {
    const prev = ["Volcano", "compass"];
    expect(isDuplicateGuess("volcano", prev)).toBe(true);
    expect(isDuplicateGuess("  VOLCANO ", prev)).toBe(true);
    expect(isDuplicateGuess("Compass", prev)).toBe(true);
  });

  it("returns false for a new guess", () => {
    expect(isDuplicateGuess("octopus", ["volcano", "compass"])).toBe(false);
  });

  it("returns false for empty input", () => {
    expect(isDuplicateGuess("", ["volcano"])).toBe(false);
  });
});

describe("wrongGuessesOnly", () => {
  const puzzle = { target: "Volcano", aliases: ["volcanoes"] };

  it("keeps wrong guesses, drops correct answers", () => {
    expect(
      wrongGuessesOnly(["mountain", "volcano", "lava", "volcanoes"], puzzle),
    ).toEqual(["mountain", "lava"]);
  });

  it("de-duplicates wrong guesses", () => {
    expect(
      wrongGuessesOnly(["Mountain", "mountain", "MOUNTAIN", "lava"], puzzle),
    ).toEqual(["mountain", "lava"]);
  });

  it("drops empty/whitespace entries", () => {
    expect(wrongGuessesOnly(["", "  ", "lava"], puzzle)).toEqual(["lava"]);
  });

  it("returns normalized (lowercased, trimmed) values", () => {
    expect(wrongGuessesOnly(["  Mountain  "], puzzle)).toEqual(["mountain"]);
  });

  it("returns empty array when every guess is correct", () => {
    expect(wrongGuessesOnly(["volcano", "volcanoes"], puzzle)).toEqual([]);
  });
});
