/**
 * Guess matching logic — compares a player's guess against target and aliases.
 */

import { normalizeAnswer } from "./normalize";

const ROMAN_TO_NUMERAL: Record<string, string> = {
  i: "1", ii: "2", iii: "3", iv: "4", v: "5",
  vi: "6", vii: "7", viii: "8", ix: "9", x: "10",
};

const COMMON_ALIASES: Record<string, string[]> = {
  "usa": ["united states", "united states of america", "us", "u s a"],
  "uk": ["united kingdom", "britain", "great britain", "england"],
  "ww2": ["world war 2", "world war ii", "second world war"],
  "ww1": ["world war 1", "world war i", "first world war"],
  "dna": ["deoxyribonucleic acid"],
};

/**
 * Expand a normalized string by converting roman numerals to digits
 * and looking up common alias expansions.
 * Returns all acceptable forms of the string.
 */
function expandVariants(normalized: string): string[] {
  const variants = new Set<string>([normalized]);

  // Roman numeral substitution — replace standalone roman numerals
  const words = normalized.split(" ");
  const expanded = words.map((w) => ROMAN_TO_NUMERAL[w] ?? w).join(" ");
  variants.add(expanded);

  // Reverse: digits to roman
  const numeralToRoman: Record<string, string> = {};
  for (const [roman, num] of Object.entries(ROMAN_TO_NUMERAL)) {
    numeralToRoman[num] = roman;
  }
  const expanded2 = words.map((w) => numeralToRoman[w] ?? w).join(" ");
  variants.add(expanded2);

  // Common aliases
  for (const [abbr, expansions] of Object.entries(COMMON_ALIASES)) {
    if (normalized === abbr) {
      expansions.forEach((e) => variants.add(e));
    }
    if (expansions.includes(normalized)) {
      variants.add(abbr);
      expansions.forEach((e) => variants.add(e));
    }
  }

  return [...variants];
}

/**
 * Match a guess against a target and its aliases.
 * Performs normalized comparison with roman numeral and common alias support.
 */
export function matchGuess(guess: string, target: string, aliases: string[] = []): boolean {
  const normalizedGuess = normalizeAnswer(guess);
  if (!normalizedGuess) return false;

  const targets = [target, ...aliases].map((t) => normalizeAnswer(t));

  // Direct normalized match
  for (const t of targets) {
    if (normalizedGuess === t) return true;
  }

  // Expanded variant match (roman numerals, common aliases)
  const guessVariants = expandVariants(normalizedGuess);
  for (const t of targets) {
    const targetVariants = expandVariants(t);
    for (const gv of guessVariants) {
      for (const tv of targetVariants) {
        if (gv === tv) return true;
      }
    }
  }

  return false;
}
