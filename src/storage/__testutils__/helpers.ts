/**
 * Shared date helpers for storage-layer tests.
 *
 * Previously each test file (`actions.test.ts`, `client.test.ts`,
 * `edge-cases.test.ts`, `integration.test.ts`) copy-pasted `todayUtc` and
 * `daysAgo`. They were byte-identical, so extracting them removes a four-way
 * duplication and keeps the UTC-date math in one auditable place (review P2-53,
 * guardrail #4 "extract shared helpers to a single module").
 *
 * Note: `makeV1Fixture` is intentionally NOT extracted — the variants in
 * `migrate.test.ts` and `client.test.ts` carry different fixture data
 * (different day counts, streak anchors, last30Days entries) on purpose, so
 * merging them would weaken coverage. Keep test-specific fixtures local.
 */

/** Returns today's UTC date as `YYYY-MM-DD` (the storage date format). */
export function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Returns the UTC date `n` days ago as `YYYY-MM-DD`. */
export function daysAgo(n: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().slice(0, 10);
}
