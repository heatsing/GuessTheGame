/**
 * check-content.mjs — Runs all three content checks in a single process:
 *   1. Schema validation
 *   2. Asset existence
 *   3. Duplicate / alias conflicts
 *
 * Exits non-zero if any check reports a problem.
 *
 * Run: `npm run content:check`
 */
import { validateAll, checkAssets, checkDuplicates } from "./lib/validators.mjs";

let problems = 0;

// 1. Schema validation
const v = validateAll();
console.log("");
console.log("=== 1/3 Schema validation ===");
console.log(
  `Checked ${v.total}, passed ${v.passed.length}, failed ${v.failed.length}`
);
if (v.failed.length > 0) {
  problems += v.failed.length;
  for (const f of v.failed) {
    console.log(`  FAIL ${f.path}: ${f.formatted}`);
  }
}

// 2. Asset check
const a = checkAssets();
console.log("");
console.log("=== 2/3 Asset check ===");
console.log(`Referenced ${a.checked}, missing ${a.missing.length}`);
if (a.missing.length > 0) {
  problems += a.missing.length;
  for (const m of a.missing) {
    console.log(`  FAIL ${m.id} -> ${m.image}`);
  }
}

// 3. Duplicate check
const d = checkDuplicates();
const dupCount =
  d.duplicateIds.length + d.duplicateSlugs.length + d.aliasConflicts.length;
console.log("");
console.log("=== 3/3 Duplicate check ===");
console.log(`Checked ${d.checkedCount} valid puzzle(s); ${dupCount} problem(s)`);
if (d.duplicateIds.length > 0) {
  for (const x of d.duplicateIds)
    console.log(`  FAIL duplicate id: ${x.id}`);
}
if (d.duplicateSlugs.length > 0) {
  for (const x of d.duplicateSlugs)
    console.log(`  FAIL duplicate slug [${x.mode}]: ${x.slug}`);
}
if (d.aliasConflicts.length > 0) {
  for (const x of d.aliasConflicts)
    console.log(
      `  FAIL alias conflict [${x.mode}]: ${x.a.id} <-> ${x.b.id} (${x.sharedAnswers.join(",")})`
    );
}

console.log("");
console.log("=== Summary ===");
if (problems > 0) {
  console.log(`${problems} total problem(s).`);
  process.exitCode = 1;
} else {
  console.log("All content checks passed.");
}
