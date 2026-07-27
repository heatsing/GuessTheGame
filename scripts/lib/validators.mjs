import { existsSync, statSync } from "node:fs";
import { join } from "node:path";
import { readAllPuzzleFiles, getPublicDir, formatError } from "./content-reader.mjs";
import { normalizeAnswer } from "../../src/lib/game/match.ts";

/**
 * Three content-integrity checks used by the validation scripts:
 *   - validateAll()      : schema conformance for every puzzle JSON
 *   - checkAssets()      : screenshot image files exist under public/
 *   - checkDuplicates()  : unique IDs, per-mode unique slugs, per-mode
 *                          disjoint answer sets (target + aliases)
 *
 * Each returns a structured result object so callers can render their own
 * output. `check-content.mjs` runs all three in a single process.
 *
 * `normalizeAnswer` is imported from `src/lib/game/match.ts` (the runtime
 * single source of truth) via Node's `--experimental-strip-types` flag, so
 * the validator and the game matcher can never diverge (ADR-002).
 */

/** URL-safe slug derived from a target, e.g. "Mount Everest" -> "mount-everest". */
function slugify(s) {
  return String(s)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// --- 1. Schema validation ------------------------------------------------

export function validateAll() {
  const files = readAllPuzzleFiles();
  const passed = [];
  const failed = [];
  for (const f of files) {
    if (f.ok) {
      passed.push(f);
    } else {
      failed.push({ ...f, formatted: formatError(f.error) });
    }
  }
  return { passed, failed, total: files.length };
}

// --- 2. Asset check ------------------------------------------------------

/**
 * Per-image size caps (DECISIONS.md §image-pipeline). The main WebP cap leaves
 * headroom for quality ~78 at 800×600; the blurSrc cap is generous for a tiny
 * LQIP thumbnail (target 1-3 KB, hard cap 5 KB).
 */
const IMAGE_MAX_KB = 80;
const BLUR_SRC_MAX_KB = 5;

/**
 * Checks that every screenshot puzzle's `image` (and optional `blurSrc`)
 * resolves to a real file under `public/`, and that each file is within the
 * size cap from DECISIONS.md. Exits non-zero if any referenced image is
 * missing or oversized.
 */
export function checkAssets() {
  const files = readAllPuzzleFiles();
  const referenced = [];
  for (const f of files) {
    if (!f.ok) continue;
    if (f.data.mode === "screenshot") {
      referenced.push({
        id: f.data.id,
        image: f.data.image,
        blurSrc: f.data.blurSrc,
        file: f.path,
      });
    }
  }
  const missing = [];
  const oversized = [];

  for (const ref of referenced) {
    // Main image: existence + size cap.
    const mainResult = checkAssetFile(ref.image, IMAGE_MAX_KB, ref.id);
    if (mainResult.missing) {
      missing.push({ ...ref, expectedPath: mainResult.absPath });
    } else if (mainResult.oversized) {
      oversized.push({
        id: ref.id,
        path: ref.image,
        sizeKB: mainResult.sizeKB,
        capKB: IMAGE_MAX_KB,
        kind: "image",
      });
    }

    // blurSrc (LQIP thumbnail): existence + size cap, only when defined.
    if (ref.blurSrc) {
      const blurResult = checkAssetFile(ref.blurSrc, BLUR_SRC_MAX_KB, ref.id);
      if (blurResult.missing) {
        missing.push({ id: ref.id, image: ref.blurSrc, expectedPath: blurResult.absPath });
      } else if (blurResult.oversized) {
        oversized.push({
          id: ref.id,
          path: ref.blurSrc,
          sizeKB: blurResult.sizeKB,
          capKB: BLUR_SRC_MAX_KB,
          kind: "blurSrc",
        });
      }
    }
  }

  return {
    referenced,
    missing,
    oversized,
    checked: referenced.length,
  };
}

/**
 * Checks a single asset path: resolves under `public/`, confirms it exists,
 * and verifies its size is within `capKB`.
 */
function checkAssetFile(relPath, capKB, id) {
  const rel = relPath.replace(/^\/+/, "");
  const abs = join(getPublicDir(), rel);
  if (!existsSync(abs)) {
    return { missing: true, oversized: false, absPath: abs, sizeKB: 0 };
  }
  const sizeKB = statSync(abs).size / 1024;
  return {
    missing: false,
    oversized: sizeKB > capKB,
    absPath: abs,
    sizeKB: Math.round(sizeKB * 10) / 10,
  };
}

// --- 3. Duplicate check --------------------------------------------------

export function checkDuplicates() {
  const files = readAllPuzzleFiles();
  const valid = files.filter((f) => f.ok);

  // 3a. ID duplicates (global — IDs must be unique across all modes).
  const idMap = new Map();
  for (const f of valid) {
    const id = f.data.id;
    if (!idMap.has(id)) idMap.set(id, []);
    idMap.get(id).push(f);
  }
  const duplicateIds = [];
  for (const [id, occ] of idMap) {
    if (occ.length > 1) {
      duplicateIds.push({
        id,
        occurrences: occ.map((f) => ({ path: f.path, mode: f.data.mode })),
      });
    }
  }

  // Group valid puzzles by mode for the per-mode checks below.
  const byMode = new Map();
  for (const f of valid) {
    const m = f.data.mode;
    if (!byMode.has(m)) byMode.set(m, []);
    byMode.get(m).push(f);
  }

  // 3b. Slug duplicates (per-mode). Slug = slugified target. Timeline has no
  //     target and is skipped. The same target MAY recur across different
  //     modes (e.g. "Volcano" in keywords and emoji) — only same-mode
  //     collisions are flagged.
  const duplicateSlugs = [];
  for (const [mode, arr] of byMode) {
    if (mode === "timeline") continue;
    const slugMap = new Map();
    for (const f of arr) {
      const slug = slugify(f.data.target);
      if (!slugMap.has(slug)) slugMap.set(slug, []);
      slugMap.get(slug).push(f);
    }
    for (const [slug, occ] of slugMap) {
      if (occ.length > 1) {
        duplicateSlugs.push({
          mode,
          slug,
          targets: occ.map((f) => ({
            id: f.data.id,
            target: f.data.target,
            path: f.path,
          })),
        });
      }
    }
  }

  // 3c. Alias conflicts (per-mode). For each pair of puzzles in the same mode,
  //     their accepted-answer sets (target + aliases, normalized) must be
  //     disjoint — otherwise a guess could match two different puzzles.
  const aliasConflicts = [];
  for (const [mode, arr] of byMode) {
    if (mode === "timeline") continue;
    const sets = arr.map((f) => ({
      id: f.data.id,
      target: f.data.target,
      path: f.path,
      answers: new Set([
        normalizeAnswer(f.data.target),
        ...f.data.aliases.map(normalizeAnswer),
      ]),
    }));
    for (let i = 0; i < sets.length; i++) {
      for (let j = i + 1; j < sets.length; j++) {
        const a = sets[i];
        const b = sets[j];
        const overlap = [...a.answers].filter((x) => b.answers.has(x));
        if (overlap.length > 0) {
          aliasConflicts.push({
            mode,
            a: { id: a.id, target: a.target, path: a.path },
            b: { id: b.id, target: b.target, path: b.path },
            sharedAnswers: overlap,
          });
        }
      }
    }
  }

  return {
    duplicateIds,
    duplicateSlugs,
    aliasConflicts,
    checkedCount: valid.length,
  };
}
