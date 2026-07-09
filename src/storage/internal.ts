/**
 * Internal pure helpers shared across `client.ts` and `actions.ts`.
 *
 * These utilities are NOT part of the public storage API (not re-exported from
 * `index.ts`). They exist so date arithmetic and de-duplication have a single
 * implementation — enforcing the AGENTS.md guardrail "不要把同一逻辑复制到
 * 每个模式" (do not copy the same logic into every module).
 */

/**
 * Subtracts `days` from a `YYYY-MM-DD` UTC date string, returning a new
 * `YYYY-MM-DD` string. Returns the input unchanged if it is malformed.
 *
 * Uses UTC exclusively to avoid local-timezone drift (PRD §5.1, §7.3).
 */
export function subtractDays(dateStr: string, days: number): string {
  const parts = dateStr.split("-").map(Number);
  const y = parts[0];
  const m = parts[1];
  const d = parts[2];
  if (y === undefined || m === undefined || d === undefined) {
    return dateStr;
  }
  const date = new Date(Date.UTC(y, m - 1, d));
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString().slice(0, 10);
}

/**
 * De-duplicates a string array, preserving first-occurrence order.
 */
export function dedupe(ids: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const id of ids) {
    if (!seen.has(id)) {
      seen.add(id);
      out.push(id);
    }
  }
  return out;
}

/**
 * De-duplicates and truncates to the first `cap` entries (most-recent-first
 * when the input is already newest-first).
 */
export function dedupeAndCap(ids: string[], cap: number): string[] {
  return dedupe(ids).slice(0, cap);
}
