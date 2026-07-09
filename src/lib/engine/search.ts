/**
 * Search index — for input suggestions (not for cheating).
 * Simple prefix-based search.
 */

export interface SearchEntry {
  id: string;
  target: string;
  aliases: string[];
}

export interface SearchIndex {
  /** Map of normalized first-letter to entries starting with that letter */
  byFirstLetter: Map<string, SearchEntry[]>;
  /** All entries for full-scan fallback */
  all: SearchEntry[];
}

export function buildSearchIndex(answers: SearchEntry[]): SearchIndex {
  const byFirstLetter = new Map<string, SearchEntry[]>();

  for (const entry of answers) {
    const candidates = [entry.target, ...entry.aliases];
    for (const c of candidates) {
      const normalized = c.toLowerCase().trim();
      if (!normalized) continue;
      const firstLetter = normalized[0]!;
      const existing = byFirstLetter.get(firstLetter) ?? [];
      if (!existing.some((e) => e.id === entry.id)) {
        existing.push(entry);
      }
      byFirstLetter.set(firstLetter, existing);
    }
  }

  return { byFirstLetter, all: answers };
}

/**
 * Return suggestions matching the input prefix.
 * Searches target and aliases, case-insensitive.
 * Returns at most `limit` suggestions.
 */
export function searchSuggestions(
  index: SearchIndex,
  input: string,
  limit: number = 5
): string[] {
  const normalized = input.toLowerCase().trim();
  if (!normalized) return [];

  const results = new Set<string>();
  const firstLetter = normalized[0]!;
  const candidates = index.byFirstLetter.get(firstLetter) ?? index.all;

  for (const entry of candidates) {
    const allTerms = [entry.target, ...entry.aliases];
    for (const term of allTerms) {
      const lower = term.toLowerCase().trim();
      if (lower.startsWith(normalized)) {
        results.add(entry.target);
        break;
      }
    }
    if (results.size >= limit) break;
  }

  return [...results].slice(0, limit);
}
