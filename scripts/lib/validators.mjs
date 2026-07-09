import { existsSync } from "node:fs";
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

export function checkAssets() {
  const files = readAllPuzzleFiles();
  const referenced = [];
  for (const f of files) {
    if (!f.ok) continue;
    if (f.data.mode === "screenshot") {
      referenced.push({ id: f.data.id, image: f.data.image, file: f.path });
    }
  }
  const missing = [];
  for (const ref of referenced) {
    const rel = ref.image.replace(/^\/+/, "");
    const abs = join(getPublicDir(), rel);
    if (!existsSync(abs)) {
      missing.push({ ...ref, expectedPath: abs });
    }
  }
  return { referenced, missing, checked: referenced.length };
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
