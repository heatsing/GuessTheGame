import { loadPuzzlesByMode, loadAllPuzzles } from "@/lib/content/loader";
import type { Mode, Puzzle } from "@/lib/content/schemas";

/**
 * Puzzle selection for play pages and the Daily Mixed Challenge.
 *
 * Two selection modes (PRD §5.1, §6.3):
 *  - **Random** (for `/play/{mode}`): a player visiting an unlimited mode gets
 *    a puzzle from that mode's pool. Deterministic per `seed` so a re-render
 *    within the same session does not flip the puzzle (the client component
 *    passes a stable seed such as a session id or `Date.now()` captured once).
 *  - **Daily** (for `/daily`): one puzzle per mode, deterministically derived
 *    from the UTC date string. Same date = same 4 puzzles for every player,
 *    every device, every reload (PRD §5.1).
 *
 * Pure + deterministic: no `Math.random` — every selection is a hash of the
 * seed/date. This is critical for the Daily Challenge's "same for everyone"
 * guarantee, and for test reproducibility.
 */

// --- Deterministic hash (FNV-1a 32-bit) ----------------------------------

/**
 * FNV-1a 32-bit hash. Chosen because:
 *  - Public domain (no license entanglement, unlike some hash funcs).
 *  - Fast, good distribution for short strings (date strings, seeds).
 *  - Deterministic across all JS runtimes (no BigInt, no platform endian).
 *
 * Returns a non-negative 32-bit integer.
 */
function fnv1aHash(input: string): number {
  let hash = 0x811c9dc5; // FNV offset basis (32-bit)
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    // FNV prime (32-bit). Use Math.imul to stay in 32-bit range without BigInt.
    hash = Math.imul(hash, 0x01000193);
  }
  // Force non-negative (Math.imul can return negative; >>> 0 converts to uint32).
  return hash >>> 0;
}

// --- Random selection (for /play/{mode}) ---------------------------------

/**
 * Selects a puzzle from the given mode's pool, deterministically by `seed`.
 *
 * The seed is required (not defaulted to `Math.random()`) so that:
 *  - React re-renders do not flip the puzzle mid-session.
 *  - Tests are reproducible.
 *
 * The caller should capture a stable seed (e.g. `useId()` for per-component
 * stability, or a sessionStorage-cached value for per-session stability).
 *
 * @returns The selected puzzle, or `null` if the mode pool is empty (caller
 *          must handle — e.g. show a "no puzzles available" state).
 */
export function selectPuzzleBySeed(mode: Mode, seed: string): Puzzle | null {
  const pool = loadPuzzlesByMode(mode);
  if (pool.length === 0) return null;
  const index = fnv1aHash(seed) % pool.length;
  return pool[index] ?? null;
}

/**
 * Selects a puzzle from the entire pool (all modes), deterministically by
 * `seed`. Used by the homepage "random puzzle" CTA if we add one; currently
 * unused but exported for completeness and test coverage.
 */
export function selectAnyPuzzleBySeed(seed: string): Puzzle | null {
  const pool = loadAllPuzzles();
  if (pool.length === 0) return null;
  const index = fnv1aHash(seed) % pool.length;
  return pool[index] ?? null;
}

// --- Daily selection (for /daily) ----------------------------------------

/**
 * Selects one puzzle per mode for the given UTC date, deterministically.
 *
 * PRD §5.1: "The 4 puzzles are deterministically selected from the puzzle pool
 * using a hash of the UTC date string (e.g. `2026-07-09`). Same date = same
 * puzzles for every player."
 *
 * PRD §6.3: "Puzzles are assigned to dates at build time using a deterministic
 * hash: `dailyPuzzles = hash(utcDateString) % poolSize` for each mode."
 *
 * The PRD mentions a pre-generated `data/daily-schedule.json` (§6.3), but this
 * implementation computes the selection on-demand from the same hash function.
 * The result is identical to a pre-generated schedule (same hash → same index),
 * so we get the "same for everyone" guarantee without a build-time generation
 * step. If the schedule file is added later for SEO/pre-computation reasons,
 * this function can be swapped to read from it without changing call sites.
 *
 * @param utcDate A `YYYY-MM-DD` UTC date string (e.g. `"2026-07-09"`).
 * @returns An object mapping each mode to its selected puzzle for that date.
 *          If a mode's pool is empty, that mode's entry is `null` (the Daily
 *          page must handle this gracefully — though content:check guarantees
 *          non-empty pools in practice).
 */
export interface DailyPuzzleSet {
  keywords: Puzzle | null;
  emoji: Puzzle | null;
  screenshot: Puzzle | null;
  timeline: Puzzle | null;
}

export function selectDailyPuzzles(utcDate: string): DailyPuzzleSet {
  return {
    keywords: selectDailyPuzzleForMode("keywords", utcDate),
    emoji: selectDailyPuzzleForMode("emoji", utcDate),
    screenshot: selectDailyPuzzleForMode("screenshot", utcDate),
    timeline: selectDailyPuzzleForMode("timeline", utcDate),
  };
}

/**
 * Selects the daily puzzle for a single mode. Exported so the Daily page can
 * request one mode at a time if needed (e.g. lazy-loaded cards), and so the
 * test suite can verify per-mode determinism without constructing a full set.
 */
export function selectDailyPuzzleForMode(mode: Mode, utcDate: string): Puzzle | null {
  const pool = loadPuzzlesByMode(mode);
  if (pool.length === 0) return null;
  // PRD §6.3: hash(utcDateString) % poolSize. The mode name is folded into
  // the hash input so that the same date produces DIFFERENT indices across
  // modes (otherwise all 4 modes would pick the same relative position in
  // their pools, which is not wrong but feels less varied).
  const hashInput = `${utcDate}:${mode}`;
  const index = fnv1aHash(hashInput) % pool.length;
  return pool[index] ?? null;
}

// --- Exposed for testing -------------------------------------------------

/**
 * Exposed solely so unit tests can verify determinism without depending on the
 * full puzzle pool. Not intended for production use outside this module.
 */
export const __test = { fnv1aHash };
