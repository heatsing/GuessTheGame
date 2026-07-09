import { describe, it, expect } from "vitest";
import { buildSearchIndex, searchSuggestions } from "./search";

const entries = [
  { id: "kw-001", target: "Volcano", aliases: ["volcano"] },
  { id: "kw-002", target: "Compass", aliases: ["compass"] },
  { id: "em-001", target: "Octopus", aliases: ["octopus", "squid"] },
  { id: "ss-001", target: "Mount Everest", aliases: ["everest", "mt everest"] },
];

describe("buildSearchIndex", () => {
  it("creates an index with entries", () => {
    const index = buildSearchIndex(entries);
    expect(index.all).toHaveLength(4);
    expect(index.byFirstLetter.size).toBeGreaterThan(0);
  });

  it("indexes by first letter of target and aliases", () => {
    const index = buildSearchIndex(entries);
    expect(index.byFirstLetter.get("v")).toBeDefined();
    expect(index.byFirstLetter.get("c")).toBeDefined();
    expect(index.byFirstLetter.get("o")).toBeDefined();
    expect(index.byFirstLetter.get("m")).toBeDefined();
  });
});

describe("searchSuggestions", () => {
  const index = buildSearchIndex(entries);

  it("returns matching targets by prefix", () => {
    const results = searchSuggestions(index, "vol");
    expect(results).toContain("Volcano");
  });

  it("matches aliases", () => {
    const results = searchSuggestions(index, "eve");
    expect(results).toContain("Mount Everest");
  });

  it("is case-insensitive", () => {
    const results = searchSuggestions(index, "VOL");
    expect(results).toContain("Volcano");
  });

  it("returns empty for no match", () => {
    expect(searchSuggestions(index, "xyz")).toEqual([]);
  });

  it("returns empty for empty input", () => {
    expect(searchSuggestions(index, "")).toEqual([]);
  });

  it("respects limit", () => {
    const results = searchSuggestions(index, "o", 1);
    expect(results.length).toBeLessThanOrEqual(1);
  });
});
