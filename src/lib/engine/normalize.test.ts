import { describe, it, expect } from "vitest";
import { normalizeAnswer } from "./normalize";

describe("normalizeAnswer", () => {
  it("lowercases and trims", () => {
    expect(normalizeAnswer("  Volcano  ")).toBe("volcano");
  });

  it("removes punctuation", () => {
    expect(normalizeAnswer("Mt. Everest!")).toBe("mt everest");
    expect(normalizeAnswer("hello, world")).toBe("hello world");
    expect(normalizeAnswer("(test)")).toBe("test");
    expect(normalizeAnswer("two-three")).toBe("two three");
  });

  it("collapses multiple spaces", () => {
    expect(normalizeAnswer("a   b    c")).toBe("a b c");
  });

  it("handles empty string", () => {
    expect(normalizeAnswer("")).toBe("");
    expect(normalizeAnswer("   ")).toBe("");
  });

  it("strips leading articles when option is set", () => {
    expect(normalizeAnswer("The Volcano", { stripArticles: true })).toBe("volcano");
    expect(normalizeAnswer("A compass", { stripArticles: true })).toBe("compass");
    expect(normalizeAnswer("An elephant", { stripArticles: true })).toBe("elephant");
  });

  it("does not strip articles by default", () => {
    expect(normalizeAnswer("The Volcano")).toBe("the volcano");
  });

  it("does not strip article if it is the only word", () => {
    expect(normalizeAnswer("The", { stripArticles: true })).toBe("the");
  });
});
