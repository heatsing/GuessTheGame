import { describe, it, expect } from "vitest";

import {
  DomainEnum,
  EmojiPuzzleSchema,
  KeywordsPuzzleSchema,
  PuzzleSchema,
  ScreenshotPuzzleSchema,
  TimelinePuzzleSchema,
} from "./schemas";

// --- Valid base samples (mirror the fixture JSON in src/data/) ------------

const validKeywords = {
  id: "kw-001",
  mode: "keywords",
  domain: "geography",
  target: "Volcano",
  aliases: ["volcano", "volcanoes"],
  keywords: ["mountain", "heat", "lava", "eruption", "magma", "crater"],
  fact: "A volcano is a rupture in the crust of a planetary-mass object.",
};

const validEmoji = {
  id: "em-001",
  mode: "emoji",
  domain: "geography",
  target: "Volcano",
  aliases: ["volcano"],
  emojis: ["🌋", "💨", "🔥"],
  hints: { category: "Geography", firstLetter: "V" },
  fact: "A volcano is a rupture in Earth's crust.",
};

const validScreenshot = {
  id: "ss-001",
  mode: "screenshot",
  domain: "geography",
  target: "Mount Everest",
  aliases: ["mount everest", "everest"],
  image: "/images/puzzles/ss-001.webp",
  imageLicense: "public-domain",
  imageAttribution: "NASA, via Wikimedia Commons",
  fact: "Mount Everest is Earth's highest mountain above sea level.",
};

const validTimeline = {
  id: "tl-001",
  mode: "timeline",
  domain: "history",
  items: [
    { title: "Printing press invented", description: "Gutenberg's press", date: 1440 },
    { title: "Steam engine patented", description: "Watt's engine", date: 1769 },
    { title: "First airplane flight", description: "Wright brothers", date: 1903 },
    { title: "Moon landing", description: "Apollo 11", date: 1969 },
  ],
  fact: "Four inventions spanning 500 years of progress.",
};

describe("PuzzleSchema — valid puzzles", () => {
  it("accepts a valid keywords puzzle", () => {
    expect(KeywordsPuzzleSchema.safeParse(validKeywords).success).toBe(true);
    expect(PuzzleSchema.safeParse(validKeywords).success).toBe(true);
  });

  it("accepts a valid emoji puzzle", () => {
    expect(EmojiPuzzleSchema.safeParse(validEmoji).success).toBe(true);
    expect(PuzzleSchema.safeParse(validEmoji).success).toBe(true);
  });

  it("accepts a valid screenshot puzzle", () => {
    expect(ScreenshotPuzzleSchema.safeParse(validScreenshot).success).toBe(true);
    expect(PuzzleSchema.safeParse(validScreenshot).success).toBe(true);
  });

  it("accepts a valid timeline puzzle", () => {
    expect(TimelinePuzzleSchema.safeParse(validTimeline).success).toBe(true);
    expect(PuzzleSchema.safeParse(validTimeline).success).toBe(true);
  });
});

describe("PuzzleSchema — missing required fields", () => {
  it("fails when a required field (fact) is missing", () => {
    const { fact: _fact, ...missingFact } = validKeywords;
    void _fact;
    const result = PuzzleSchema.safeParse(missingFact);
    expect(result.success).toBe(false);
  });

  it("fails when keywords.target is missing", () => {
    const { target: _target, ...missingTarget } = validKeywords;
    void _target;
    expect(PuzzleSchema.safeParse(missingTarget).success).toBe(false);
  });

  it("fails when screenshot.imageLicense is missing", () => {
    const { imageLicense: _license, ...missing } = validScreenshot;
    void _license;
    expect(PuzzleSchema.safeParse(missing).success).toBe(false);
  });

  it("fails when timeline.fact is missing", () => {
    const { fact: _fact2, ...missing } = validTimeline;
    void _fact2;
    expect(PuzzleSchema.safeParse(missing).success).toBe(false);
  });
});

describe("PuzzleSchema — ID format", () => {
  it("fails on a malformed id (wrong digit count)", () => {
    const result = PuzzleSchema.safeParse({ ...validKeywords, id: "kw-1" });
    expect(result.success).toBe(false);
  });

  it("fails on a malformed id (uppercase prefix)", () => {
    const result = PuzzleSchema.safeParse({ ...validKeywords, id: "KW-001" });
    expect(result.success).toBe(false);
  });

  it("fails on a malformed id (non-alphabetic prefix)", () => {
    const result = PuzzleSchema.safeParse({ ...validKeywords, id: "k1-001" });
    expect(result.success).toBe(false);
  });

  it("fails on a malformed id (missing hyphen)", () => {
    const result = PuzzleSchema.safeParse({ ...validKeywords, id: "kw001" });
    expect(result.success).toBe(false);
  });
});

describe("PuzzleSchema — array length constraints", () => {
  it("fails when keywords has fewer than 4 entries", () => {
    const result = PuzzleSchema.safeParse({
      ...validKeywords,
      keywords: ["mountain", "heat", "lava"],
    });
    expect(result.success).toBe(false);
  });

  it("fails when timeline items has fewer than 4 entries", () => {
    const result = PuzzleSchema.safeParse({
      ...validTimeline,
      items: validTimeline.items.slice(0, 3),
    });
    expect(result.success).toBe(false);
  });

  it("fails when emojis has fewer than 3 entries", () => {
    const result = PuzzleSchema.safeParse({
      ...validEmoji,
      emojis: ["🌋", "💨"],
    });
    expect(result.success).toBe(false);
  });

  it("fails when keywords has more than 8 entries", () => {
    const result = PuzzleSchema.safeParse({
      ...validKeywords,
      keywords: ["a", "b", "c", "d", "e", "f", "g", "h", "i"],
    });
    expect(result.success).toBe(false);
  });

  it("fails when timeline items has more than 6 entries", () => {
    const result = PuzzleSchema.safeParse({
      ...validTimeline,
      items: [
        ...validTimeline.items,
        { title: "X", description: "y", date: 2000 },
        { title: "Z", description: "y", date: 2010 },
        { title: "W", description: "y", date: 2020 },
      ],
    });
    expect(result.success).toBe(false);
  });
});

describe("PuzzleSchema — domain", () => {
  it("fails on an invalid domain", () => {
    const result = PuzzleSchema.safeParse({
      ...validKeywords,
      domain: "sports",
    });
    expect(result.success).toBe(false);
  });

  it("accepts every domain in the enum", () => {
    for (const domain of DomainEnum.options) {
      const result = PuzzleSchema.safeParse({ ...validKeywords, domain });
      expect(result.success).toBe(true);
    }
  });
});

describe("PuzzleSchema — discriminator", () => {
  it("fails on an unknown mode", () => {
    const result = PuzzleSchema.safeParse({
      ...validKeywords,
      mode: "riddle",
    });
    expect(result.success).toBe(false);
  });

  it("fails when mode does not match the puzzle's fields (keywords mode on a timeline body)", () => {
    const result = PuzzleSchema.safeParse({
      ...validTimeline,
      mode: "keywords",
    });
    expect(result.success).toBe(false);
  });

  it("fails when timeline mode is used with target/aliases instead of items", () => {
    const result = PuzzleSchema.safeParse({
      ...validKeywords,
      mode: "timeline",
    });
    expect(result.success).toBe(false);
  });
});
