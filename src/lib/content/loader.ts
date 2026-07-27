import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import {
  MODE_DIRECTORIES,
  PREFIX_TO_MODE,
  parsePuzzle,
  type Mode,
  type Puzzle,
  type PuzzleIndexRow,
} from "./schemas";

/**
 * Build-time content loader for Guess the Game.
 *
 * All data lives as static JSON under `src/data/{mode}/{id}.json`. This module
 * reads and validates those files with `parsePuzzle` (mode-dispatched Zod
 * schemas) so that malformed content fails loudly at build time rather than
 * rendering broken UI.
 *
 * No runtime backend, no database — see `docs/PRD.md` §1 and `docs/architecture.md`.
 */

// Base directory for puzzle JSON. Defaults to `src/data` under the cwd; the
// `GTG_DATA_DIR` env override exists solely so unit tests can point the loader
// at a temp fixture tree instead of mocking `node:fs` (which is fragile under
// vitest module hoisting). Production builds never set it.
//
// Read on each call (not captured at module-eval time) so tests that swap the
// env between cases do not need `vi.resetModules()` — which would otherwise
// pollute the module cache for subsequent tests in the same file. The cost is
// one `process.env` read per loader call, which is negligible (loader runs at
// build time / on-demand, not in hot loops).
function dataDir(): string {
  return process.env.GTG_DATA_DIR
    ? join(process.env.GTG_DATA_DIR)
    : join(process.cwd(), "src", "data");
}

/** Resolves the absolute path to a mode's data directory. */
function modeDir(mode: Mode): string {
  return join(dataDir(), mode);
}

/** Reads and validates a single puzzle JSON file. Returns null on any error. */
function readPuzzleFile(filePath: string): Puzzle | null {
  if (!existsSync(filePath)) return null;
  let json: unknown;
  try {
    json = JSON.parse(readFileSync(filePath, "utf-8"));
  } catch (err) {
    console.error(`[content] Failed to parse ${filePath}:`, err);
    return null;
  }
  const result = parsePuzzle(json);
  if (!result.success) {
    console.error(`[content] Invalid puzzle at ${filePath}:`);
    for (const issue of result.error.issues) {
      console.error(`  - ${issue.path.join(".")}: ${issue.message}`);
    }
    return null;
  }
  return result.data;
}

/** Maps an ID prefix (e.g. "kw") to its mode directory (e.g. "keywords"). */
function modeFromId(id: string): Mode | null {
  const prefix = id.split("-")[0]?.toLowerCase();
  if (!prefix) return null;
  return PREFIX_TO_MODE[prefix] ?? null;
}

/**
 * Loads a single puzzle by ID. Scans the mode directory implied by the ID
 * prefix, falling back to scanning every mode directory if the prefix is
 * unrecognized.
 */
export function loadPuzzleById(id: string): Puzzle | null {
  const expectedMode = modeFromId(id);
  if (expectedMode) {
    const filePath = join(modeDir(expectedMode), `${id}.json`);
    return readPuzzleFile(filePath);
  }
  // Unknown prefix — fall back to a full scan so lookups still work.
  for (const mode of MODE_DIRECTORIES) {
    const filePath = join(modeDir(mode), `${id}.json`);
    const puzzle = readPuzzleFile(filePath);
    if (puzzle) return puzzle;
  }
  return null;
}

/** Loads every puzzle for a given mode, sorted by ID. */
export function loadPuzzlesByMode(mode: string): Puzzle[] {
  const dir = modeDir(mode as Mode);
  if (!existsSync(dir)) return [];
  const files = readdirSync(dir).filter((f) => f.endsWith(".json"));
  const puzzles = files
    .map((f) => readPuzzleFile(join(dir, f)))
    .filter((p): p is Puzzle => p !== null);
  puzzles.sort((a, b) => a.id.localeCompare(b.id));
  return puzzles;
}

/** Loads every puzzle across all modes, sorted by ID. */
export function loadAllPuzzles(): Puzzle[] {
  const puzzles = MODE_DIRECTORIES.flatMap((mode) => loadPuzzlesByMode(mode));
  puzzles.sort((a, b) => a.id.localeCompare(b.id));
  return puzzles;
}

/** Returns a lightweight index of `{ id, mode, domain }` for every puzzle. */
export function getPuzzleIndex(): PuzzleIndexRow[] {
  return loadAllPuzzles().map((p) => ({
    id: p.id,
    mode: p.mode,
    domain: p.domain,
  }));
}
