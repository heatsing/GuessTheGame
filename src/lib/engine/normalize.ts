/**
 * Answer normalization — shared by all game modes.
 * Pure functions, no side effects.
 */

const PUNCTUATION_REGEX = /[.,!?;:'"()\[\]{}\-—–_/\\]/g;
const MULTI_SPACE_REGEX = /\s+/g;
const ARTICLES = ["the", "a", "an"];

export interface NormalizeOptions {
  /** Remove leading English articles (the/a/an). Default: false */
  stripArticles?: boolean;
}

/**
 * Normalize a player's answer for comparison.
 * - lowercase
 * - trim
 * - remove punctuation
 * - collapse multiple spaces
 * - optionally strip leading articles (the/a/an)
 */
export function normalizeAnswer(input: string, options: NormalizeOptions = {}): string {
  if (!input) return "";

  let result = input.toLowerCase().trim();
  result = result.replace(PUNCTUATION_REGEX, " ");
  result = result.replace(MULTI_SPACE_REGEX, " ").trim();

  if (options.stripArticles) {
    const words = result.split(" ");
    if (words.length > 1 && ARTICLES.includes(words[0]!)) {
      result = words.slice(1).join(" ");
    }
  }

  return result;
}
