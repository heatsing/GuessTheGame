/**
 * UTC date helper for production code.
 *
 * Returns today's UTC date as `YYYY-MM-DD` — the storage date format used by
 * `DailyProgress` keys and `recordModeResult`. Uses `toISOString()` which is
 * always UTC regardless of the device timezone (PRD §5.1, §7.3).
 *
 * Kept separate from the test-only `todayUtc` in `src/storage/__testutils__/`
 * so production code does not import from a `__testutils__` path (which would
 * be a code smell). The implementations are byte-identical; the separation is
 * about import hygiene, not behavior.
 */
export function utcToday(): string {
  return new Date().toISOString().slice(0, 10);
}
