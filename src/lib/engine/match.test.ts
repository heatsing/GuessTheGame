import { describe, it, expect } from "vitest";
import { matchGuess } from "./match";

describe("matchGuess", () => {
  it("matches case-insensitively", () => {
    expect(matchGuess("Volcano", "Volcano")).toBe(true);
    expect(matchGuess("volcano", "Volcano")).toBe(true);
    expect(matchGuess("VOLCANO", "Volcano")).toBe(true);
  });

  it("matches with different punctuation", () => {
    expect(matchGuess("Mt. Everest", "Mt Everest")).toBe(true);
    expect(matchGuess("Mt-Everest", "Mt Everest")).toBe(true);
  });

  it("matches with extra whitespace", () => {
    expect(matchGuess("  volcano  ", "Volcano")).toBe(true);
  });

  it("matches aliases", () => {
    expect(matchGuess("everest", "Mount Everest", ["everest", "mt everest"])).toBe(true);
    expect(matchGuess("mt everest", "Mount Everest", ["everest", "mt everest"])).toBe(true);
  });

  it("matches roman numerals to digits", () => {
    expect(matchGuess("World War 2", "World War II")).toBe(true);
    expect(matchGuess("World War II", "World War 2")).toBe(true);
    expect(matchGuess("Chapter 3", "Chapter III")).toBe(true);
  });

  it("matches common aliases (USA)", () => {
    expect(matchGuess("USA", "United States")).toBe(true);
    expect(matchGuess("United States of America", "United States")).toBe(true);
  });

  it("returns false for non-matching guess", () => {
    expect(matchGuess("mountain", "Volcano")).toBe(false);
    expect(matchGuess("river", "Volcano", ["lava", "eruption"])).toBe(false);
  });

  it("returns false for empty guess", () => {
    expect(matchGuess("", "Volcano")).toBe(false);
    expect(matchGuess("   ", "Volcano")).toBe(false);
  });

  it("returns false for partial match", () => {
    expect(matchGuess("vol", "Volcano")).toBe(false);
    expect(matchGuess("volcan", "Volcano")).toBe(false);
  });
});
