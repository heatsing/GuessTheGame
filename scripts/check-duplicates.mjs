/**
 * check-duplicates.mjs — Detects three kinds of content collisions:
 *   1. Duplicate puzzle IDs (global)
 *   2. Duplicate slugs (per-mode slugified target; timeline skipped)
 *   3. Alias conflicts (per-mode overlap of target+aliases between puzzles)
 *
 * Exits non-zero if any problem is found.
 *
 * Run: `npm run content:duplicates`
 */
import { checkDuplicates } from "./lib/validators.mjs";

const { duplicateIds, duplicateSlugs, aliasConflicts, checkedCount } =
  checkDuplicates();

console.log("");
console.log("=== Duplicate check ===");
console.log(`Checked ${checkedCount} valid puzzle(s).`);

let problems = 0;

if (duplicateIds.length > 0) {
  problems += duplicateIds.length;
  console.log("");
  console.log("Duplicate IDs:");
  for (const d of duplicateIds) {
    console.log(`  FAIL id "${d.id}" appears ${d.occurrences.length} times:`);
    for (const o of d.occurrences) {
      console.log(`       - ${o.path} (${o.mode})`);
    }
  }
}

if (duplicateSlugs.length > 0) {
  problems += duplicateSlugs.length;
  console.log("");
  console.log("Duplicate slugs (per-mode target):");
  for (const d of duplicateSlugs) {
    console.log(
      `  FAIL [${d.mode}] slug "${d.slug}" used by ${d.targets.length} puzzles:`
    );
    for (const t of d.targets) {
      console.log(`       - ${t.id} (target "${t.target}") -- ${t.path}`);
    }
  }
}

if (aliasConflicts.length > 0) {
  problems += aliasConflicts.length;
  console.log("");
  console.log("Alias conflicts (per-mode answer overlap):");
  for (const c of aliasConflicts) {
    console.log(
      `  FAIL [${c.mode}] "${c.a.id}" and "${c.b.id}" share: ${c.sharedAnswers.join(", ")}`
    );
    console.log(`       - ${c.a.id} (${c.a.target}) -- ${c.a.path}`);
    console.log(`       - ${c.b.id} (${c.b.target}) -- ${c.b.path}`);
  }
}

if (problems > 0) {
  console.log("");
  console.log(`${problems} duplicate/conflict problem(s) found.`);
  process.exitCode = 1;
} else {
  console.log("");
  console.log("No duplicate IDs, slugs, or alias conflicts.");
}
