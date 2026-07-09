/**
 * validate-content.mjs — Validates every puzzle JSON file against its
 * mode-specific Zod schema (via `parsePuzzle`). Prints a pass/fail count
 * and exits non-zero on any failure.
 *
 * Run: `npm run content:validate`
 */
import { validateAll } from "./lib/validators.mjs";

const { passed, failed, total } = validateAll();

console.log("");
console.log("=== Content validation ===");
console.log(`Checked ${total} puzzle file(s).`);
console.log(`Passed: ${passed.length}`);
console.log(`Failed: ${failed.length}`);

if (failed.length > 0) {
  console.log("");
  console.log("Failures:");
  for (const f of failed) {
    console.log(`  FAIL ${f.path} (${f.id ?? "?"}): ${f.formatted}`);
  }
  console.log("");
  console.log(`${failed.length} puzzle(s) failed validation.`);
  process.exitCode = 1;
} else {
  console.log("");
  console.log("All puzzles valid.");
}
