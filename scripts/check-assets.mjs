/**
 * check-assets.mjs — Verifies that every screenshot puzzle's `image` path
 * resolves to a real file under `public/`. Exits non-zero if any referenced
 * image is missing.
 *
 * Run: `npm run content:assets`
 */
import { checkAssets } from "./lib/validators.mjs";

const { referenced, missing, checked } = checkAssets();

console.log("");
console.log("=== Asset check ===");
console.log(`Referenced screenshot images: ${checked}`);
console.log(`Missing: ${missing.length}`);

if (missing.length > 0) {
  console.log("");
  console.log("Missing images:");
  for (const m of missing) {
    console.log(`  FAIL ${m.id} -> ${m.image}`);
    console.log(`       expected at: ${m.expectedPath}`);
  }
  console.log("");
  console.log(`${missing.length} image(s) missing under public/images/puzzles/.`);
  process.exitCode = 1;
} else if (checked === 0) {
  console.log("");
  console.log("No screenshot puzzles to check.");
} else {
  console.log("");
  console.log("All referenced images exist.");
}
