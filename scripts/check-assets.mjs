/**
 * check-assets.mjs — Verifies that every screenshot puzzle's `image` path
 * resolves to a real file under `public/`. Exits non-zero if any referenced
 * image is missing.
 *
 * Run: `npm run content:assets`
 */
import { checkAssets } from "./lib/validators.mjs";

const { referenced, missing, oversized, checked } = checkAssets();

console.log("");
console.log("=== Asset check ===");
console.log(`Referenced screenshot images: ${checked}`);
console.log(`Missing: ${missing.length}`);
console.log(`Oversized: ${oversized.length}`);

if (missing.length > 0) {
  console.log("");
  console.log("Missing images:");
  for (const m of missing) {
    console.log(`  FAIL ${m.id} -> ${m.image}`);
    console.log(`       expected at: ${m.expectedPath}`);
  }
}
if (oversized.length > 0) {
  console.log("");
  console.log("Oversized images (exceed DECISIONS.md cap):");
  for (const o of oversized) {
    console.log(`  FAIL ${o.id} ${o.kind} ${o.path}: ${o.sizeKB} KB > ${o.capKB} KB`);
  }
}

const problems = missing.length + oversized.length;
if (problems > 0) {
  console.log("");
  console.log(`${problems} image problem(s) under public/images/puzzles/.`);
  process.exitCode = 1;
} else if (checked === 0) {
  console.log("");
  console.log("No screenshot puzzles to check.");
} else {
  console.log("");
  console.log("All referenced images exist and are within size caps.");
}
