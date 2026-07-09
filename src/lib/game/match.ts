/**
 * Pure guess-matching utilities for the guess-based modes (keywords, emoji,
 * screenshot). These are intentionally minimal and side-effect free so they
 * can be unit-tested in isolation. They are NOT the full game engine (which
 * is deferred — see docs/STATUS.md Phase 4c); only the normalization + match
 * primitives that game UI and tests need.
 */

/**
 * Normalizes a player guess or puzzle answer for comparison:
 *  - lowercase
 *  - trim leading/trailing whitespace
 *  - collapse internal whitespace runs to a single space
 *
 * Examples:
 *   "  Mount   Everest " -> "mount everest"
 *   "Volcano"            -> "volcano"
 */
export function normalizeAnswer(input: string): string {
  return String(input)
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

/**
 * Collects every accepted answer (target + aliases) for a puzzle, normalized.
 * De-duplicates so two aliases that normalize to the same string are counted
 * once.
 */
export function acceptedAnswers(
  target: string,
  aliases: string[] = [],
): string[] {
  const set = new Set<string>();
  set.add(normalizeAnswer(target));
  for (const a of aliases) set.add(normalizeAnswer(a));
  return [...set];
}

/**
 * Returns true when a normalized guess matches the puzzle target or any alias.
 * Empty/blank guesses never match (prevents accidental wins on whitespace).
 */
export function isCorrectGuess(
  guess: string,
  options: { target: string; aliases?: string[] },
): boolean {
  const normalized = normalizeAnswer(guess);
  if (normalized.length === 0) return false;
  return acceptedAnswers(options.target, options.aliases).includes(normalized);
}

/**
 * Returns true when a guess has already been submitted (case/whitespace
 * insensitive). `previousGuesses` is the raw list of prior guesses.
 */
export function isDuplicateGuess(guess: string, previousGuesses: string[]): boolean {
  const normalized = normalizeAnswer(guess);
  if (normalized.length === 0) return false;
  return previousGuesses.some((g) => normalizeAnswer(g) === normalized);
}

/**
 * Returns a de-duplicated list of wrong guesses. A guess is "wrong" when it
 * is non-empty, not a duplicate of an earlier wrong guess, and not a correct
 * answer. This is the canonical store shape for `wrongGuesses` in storage.
 */
export function wrongGuessesOnly(
  guesses: string[],
  options: { target: string; aliases?: string[] },
): string[] {
  const accepted = new Set(acceptedAnswers(options.target, options.aliases));
  const seen = new Set<string>();
  const result: string[] = [];
  for (const g of guesses) {
    const normalized = normalizeAnswer(g);
    if (normalized.length === 0) continue;
    if (accepted.has(normalized)) continue;
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    result.push(normalized);
  }
  return result;
}
