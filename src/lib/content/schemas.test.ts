import { describe, it, expect } from "vitest";

import {
  DomainEnum,
  EmojiPuzzleSchema,
  KeywordsPuzzleSchema,
  ScreenshotPuzzleSchema,
  TimelinePuzzleSchema,
  parsePuzzle,
  schemaForMode,
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

describe("per-mode schemas — valid puzzles", () => {
  it("accepts a valid keywords puzzle", () => {
    expect(KeywordsPuzzleSchema.safeParse(validKeywords).success).toBe(true);
  });

  it("accepts a valid emoji puzzle", () => {
    expect(EmojiPuzzleSchema.safeParse(validEmoji).success).toBe(true);
  });

  it("accepts a valid screenshot puzzle", () => {
    expect(ScreenshotPuzzleSchema.safeParse(validScreenshot).success).toBe(true);
  });

  it("accepts a valid timeline puzzle", () => {
    expect(TimelinePuzzleSchema.safeParse(validTimeline).success).toBe(true);
  });
});

describe("per-mode schemas — missing required fields", () => {
  it("keywords fails when fact is missing", () => {
    const { fact: _fact, ...missingFact } = validKeywords;
    void _fact;
    expect(KeywordsPuzzleSchema.safeParse(missingFact).success).toBe(false);
  });

  it("keywords fails when target is missing", () => {
    const { target: _target, ...missingTarget } = validKeywords;
    void _target;
    expect(KeywordsPuzzleSchema.safeParse(missingTarget).success).toBe(false);
  });

  it("screenshot fails when imageLicense is missing", () => {
    const { imageLicense: _license, ...missing } = validScreenshot;
    void _license;
    expect(ScreenshotPuzzleSchema.safeParse(missing).success).toBe(false);
  });

  it("timeline fails when fact is missing", () => {
    const { fact: _fact2, ...missing } = validTimeline;
    void _fact2;
    expect(TimelinePuzzleSchema.safeParse(missing).success).toBe(false);
  });
});

describe("per-mode schemas — ID format", () => {
  it("fails on a malformed id (wrong digit count)", () => {
    expect(
      KeywordsPuzzleSchema.safeParse({ ...validKeywords, id: "kw-1" }).success,
    ).toBe(false);
  });

  it("fails on a malformed id (uppercase prefix)", () => {
    expect(
      KeywordsPuzzleSchema.safeParse({ ...validKeywords, id: "KW-001" }).success,
    ).toBe(false);
  });

  it("fails on a malformed id (non-alphabetic prefix)", () => {
    expect(
      KeywordsPuzzleSchema.safeParse({ ...validKeywords, id: "k1-001" }).success,
    ).toBe(false);
  });

  it("fails on a malformed id (missing hyphen)", () => {
    expect(
      KeywordsPuzzleSchema.safeParse({ ...validKeywords, id: "kw001" }).success,
    ).toBe(false);
  });
});

describe("per-mode schemas — array length constraints", () => {
  it("fails when keywords has fewer than 4 entries", () => {
    expect(
      KeywordsPuzzleSchema.safeParse({
        ...validKeywords,
        keywords: ["mountain", "heat", "lava"],
      }).success,
    ).toBe(false);
  });

  it("fails when timeline items has fewer than 4 entries", () => {
    expect(
      TimelinePuzzleSchema.safeParse({
        ...validTimeline,
        items: validTimeline.items.slice(0, 3),
      }).success,
    ).toBe(false);
  });

  it("fails when emojis has fewer than 3 entries", () => {
    expect(
      EmojiPuzzleSchema.safeParse({
        ...validEmoji,
        emojis: ["🌋", "💨"],
      }).success,
    ).toBe(false);
  });

  it("fails when keywords has more than 8 entries", () => {
    expect(
      KeywordsPuzzleSchema.safeParse({
        ...validKeywords,
        keywords: ["a", "b", "c", "d", "e", "f", "g", "h", "i"],
      }).success,
    ).toBe(false);
  });

  it("fails when timeline items has more than 6 entries", () => {
    expect(
      TimelinePuzzleSchema.safeParse({
        ...validTimeline,
        items: [
          ...validTimeline.items,
          { title: "X", description: "y", date: 2000 },
          { title: "Z", description: "y", date: 2010 },
          { title: "W", description: "y", date: 2020 },
        ],
      }).success,
    ).toBe(false);
  });
});

describe("per-mode schemas — domain", () => {
  it("fails on an invalid domain", () => {
    expect(
      KeywordsPuzzleSchema.safeParse({ ...validKeywords, domain: "sports" })
        .success,
    ).toBe(false);
  });

  it("accepts every domain in the enum", () => {
    for (const domain of DomainEnum.options) {
      expect(
        KeywordsPuzzleSchema.safeParse({ ...validKeywords, domain }).success,
      ).toBe(true);
    }
  });
});

describe("schemaForMode", () => {
  it("returns the matching schema for each mode", () => {
    expect(schemaForMode("keywords")).toBe(KeywordsPuzzleSchema);
    expect(schemaForMode("emoji")).toBe(EmojiPuzzleSchema);
    expect(schemaForMode("screenshot")).toBe(ScreenshotPuzzleSchema);
    expect(schemaForMode("timeline")).toBe(TimelinePuzzleSchema);
  });
});

describe("parsePuzzle — mode dispatch", () => {
  it("accepts each valid puzzle via dispatch", () => {
    expect(parsePuzzle(validKeywords).success).toBe(true);
    expect(parsePuzzle(validEmoji).success).toBe(true);
    expect(parsePuzzle(validScreenshot).success).toBe(true);
    expect(parsePuzzle(validTimeline).success).toBe(true);
  });

  it("fails when mode is missing", () => {
    const { mode: _mode, ...noMode } = validKeywords;
    void _mode;
    expect(parsePuzzle(noMode).success).toBe(false);
  });

  it("fails on an unknown mode", () => {
    expect(parsePuzzle({ ...validKeywords, mode: "riddle" }).success).toBe(false);
  });

  it("fails when the body does not match the declared mode", () => {
    // keywords body with timeline mode → timeline schema rejects target/aliases
    expect(parsePuzzle({ ...validKeywords, mode: "timeline" }).success).toBe(
      false,
    );
    // timeline body with keywords mode → keywords schema requires target/aliases
    expect(parsePuzzle({ ...validTimeline, mode: "keywords" }).success).toBe(
      false,
    );
  });

  it("returns the parsed puzzle data on success", () => {
    const result = parsePuzzle(validKeywords);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.id).toBe("kw-001");
      expect(result.data.mode).toBe("keywords");
    }
  });
});
