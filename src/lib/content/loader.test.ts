import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

/**
 * Tests for the build-time content loader (P1-11).
 *
 * Strategy: point the loader at a REAL temporary fixture tree via the
 * `GTG_DATA_DIR` env hook (see loader.ts), writing actual JSON files with
 * `node:fs`. This avoids mocking `node:fs`, which is fragile under vitest's
 * module hoisting, and exercises the genuine existsSync/readFileSync/readdirSync
 * code paths.
 *
 * The loader computes its DATA_DIR once at module load, so each test calls
 * `vi.resetModules()` + a fresh dynamic import after pointing the env at a new
 * temp dir.
 *
 * Valid puzzle fixtures mirror the real schema shapes (see ./schemas.ts).
 */

const KW_001 = {
  id: "kw-001",
  mode: "keywords",
  domain: "geography",
  target: "Volcano",
  aliases: ["volcano", "volcanoes"],
  keywords: ["mountain", "heat", "lava", "eruption", "magma", "crater"],
  fact: "A volcano is a rupture in the crust of a planetary-mass object.",
};

const KW_002 = {
  id: "kw-002",
  mode: "keywords",
  domain: "science",
  target: "Atom",
  aliases: ["atom", "atoms"],
  keywords: ["small", "particle", "nucleus", "electron", "proton", "neutron"],
  fact: "An atom is the smallest unit of ordinary matter that forms a chemical element.",
};

const EM_001 = {
  id: "em-001",
  mode: "emoji",
  domain: "nature",
  target: "Bee",
  aliases: ["bee", "bees"],
  emojis: ["🐝", "🌼", "🍯"],
  hints: { category: "insect", firstLetter: "b" },
  fact: "Bees are winged insects known for pollination and producing honey.",
};

let tmpRoot: string;
const createdDirs: string[] = [];

beforeEach(() => {
  tmpRoot = mkdtempSync(join(tmpdir(), "gtg-loader-"));
  createdDirs.push(tmpRoot);
});

afterEach(() => {
  vi.resetModules();
});

afterAll(() => {
  for (const dir of createdDirs) {
    rmSync(dir, { recursive: true, force: true });
  }
});

/** Point the loader at `tmpRoot` and return a fresh module instance. */
async function loadLoader() {
  process.env.GTG_DATA_DIR = tmpRoot;
  vi.resetModules();
  return import("./loader");
}

function writeFile(mode: string, id: string, content: string) {
  const dir = join(tmpRoot, mode);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, `${id}.json`), content, "utf-8");
}

function ensureModeDir(mode: string) {
  mkdirSync(join(tmpRoot, mode), { recursive: true });
}

describe("loadPuzzleById", () => {
  it("returns the puzzle when the ID prefix maps to a mode and the file exists", async () => {
    writeFile("keywords", "kw-001", JSON.stringify(KW_001));
    const { loadPuzzleById } = await loadLoader();
    const puzzle = loadPuzzleById("kw-001");
    expect(puzzle).not.toBeNull();
    expect(puzzle?.id).toBe("kw-001");
    expect(puzzle?.mode).toBe("keywords");
  });

  it("returns null when the file does not exist (no throw)", async () => {
    const { loadPuzzleById } = await loadLoader();
    expect(loadPuzzleById("kw-999")).toBeNull();
  });

  it("returns null for malformed JSON instead of throwing (P1-11)", async () => {
    writeFile("keywords", "kw-001", "{ not valid json ]]");
    const { loadPuzzleById } = await loadLoader();
    expect(loadPuzzleById("kw-001")).toBeNull();
  });

  it("returns null when the JSON is valid but schema-invalid", async () => {
    // keywords schema requires min 4 keyword clues — only 2 here.
    const bad = { ...KW_001, keywords: ["heat", "lava"] };
    writeFile("keywords", "kw-001", JSON.stringify(bad));
    const { loadPuzzleById } = await loadLoader();
    expect(loadPuzzleById("kw-001")).toBeNull();
  });

  it("falls back to a full scan for an unrecognized prefix and finds the file", async () => {
    // Query with an unknown prefix ("xx") so the prefix→mode lookup misses and
    // the loader scans every mode directory for a file named `{id}.json`. The
    // fixture uses id "xx-001" (accepted by PuzzleIdSchema `/^[a-z]{2}-\d{3}$/`)
    // with a valid keywords body so parsePuzzle succeeds.
    const xx001 = { ...KW_001, id: "xx-001" };
    writeFile("keywords", "xx-001", JSON.stringify(xx001));
    const { loadPuzzleById } = await loadLoader();
    const puzzle = loadPuzzleById("xx-001");
    expect(puzzle).not.toBeNull();
    expect(puzzle?.id).toBe("xx-001");
  });

  it("returns null when an unrecognized-prefix scan finds nothing", async () => {
    // Empty directories exist but contain no files.
    ensureModeDir("keywords");
    ensureModeDir("emoji");
    ensureModeDir("screenshot");
    ensureModeDir("timeline");
    const { loadPuzzleById } = await loadLoader();
    expect(loadPuzzleById("xx-001")).toBeNull();
  });
});

describe("loadPuzzlesByMode", () => {
  it("returns an empty array when the mode directory does not exist", async () => {
    const { loadPuzzlesByMode } = await loadLoader();
    expect(loadPuzzlesByMode("keywords")).toEqual([]);
  });

  it("returns puzzles sorted by id, skipping invalid files", async () => {
    writeFile("keywords", "kw-002", JSON.stringify(KW_002));
    writeFile("keywords", "kw-001", JSON.stringify(KW_001));
    // A malformed file that should be skipped, not crash the load.
    writeFile("keywords", "kw-003", "{ broken");
    const { loadPuzzlesByMode } = await loadLoader();
    const puzzles = loadPuzzlesByMode("keywords");
    expect(puzzles).toHaveLength(2);
    expect(puzzles[0]?.id).toBe("kw-001");
    expect(puzzles[1]?.id).toBe("kw-002");
  });

  it("returns an empty array for an empty (existing) directory", async () => {
    ensureModeDir("keywords");
    // No .json files, but a stray non-json file.
    writeFileSync(join(tmpRoot, "keywords", "README.md"), "# Keywords", "utf-8");
    const { loadPuzzlesByMode } = await loadLoader();
    expect(loadPuzzlesByMode("keywords")).toEqual([]);
  });
});

describe("loadAllPuzzles", () => {
  it("aggregates puzzles across all modes, sorted by id", async () => {
    writeFile("keywords", "kw-001", JSON.stringify(KW_001));
    writeFile("emoji", "em-001", JSON.stringify(EM_001));
    const { loadAllPuzzles } = await loadLoader();
    const puzzles = loadAllPuzzles();
    expect(puzzles).toHaveLength(2);
    expect(puzzles.map((p) => p.id)).toEqual(["em-001", "kw-001"]);
  });
});

describe("getPuzzleIndex", () => {
  it("returns lightweight { id, mode, domain } rows for every puzzle", async () => {
    writeFile("keywords", "kw-001", JSON.stringify(KW_001));
    writeFile("emoji", "em-001", JSON.stringify(EM_001));
    const { getPuzzleIndex } = await loadLoader();
    const index = getPuzzleIndex();
    expect(index).toEqual([
      { id: "em-001", mode: "emoji", domain: "nature" },
      { id: "kw-001", mode: "keywords", domain: "geography" },
    ]);
  });
});
