import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { PuzzleSchema, MODE_DIRECTORIES } from "../../src/lib/content/schemas.ts";

/**
 * Shared content reader for the validation scripts.
 *
 * Reads puzzle JSON files from `src/data/{mode}/` and validates each against
 * `PuzzleSchema`. The schema is imported directly from the TypeScript source
 * via Node's `--experimental-strip-types` flag, so there is a single source of
 * truth shared with the app and unit tests.
 */

const DATA_DIR = join(process.cwd(), "src", "data");
const PUBLIC_DIR = join(process.cwd(), "public");

export function getDataDir() {
  return DATA_DIR;
}

export function getPublicDir() {
  return PUBLIC_DIR;
}

/** Lists every puzzle JSON file as `{ mode, name, path, id }`. */
export function listPuzzleFiles() {
  const files = [];
  for (const mode of MODE_DIRECTORIES) {
    const dir = join(DATA_DIR, mode);
    if (!existsSync(dir)) continue;
    const names = readdirSync(dir).sort();
    for (const name of names) {
      if (!name.endsWith(".json")) continue;
      files.push({
        mode,
        name,
        path: join(dir, name),
        id: name.slice(0, -".json".length),
      });
    }
  }
  return files;
}

/** Reads + parses + validates one puzzle file. Throws on read/parse error. */
export function readPuzzleFile(filePath) {
  const raw = readFileSync(filePath, "utf-8");
  const json = JSON.parse(raw);
  const result = PuzzleSchema.safeParse(json);
  if (result.success) {
    return { ok: true, data: result.data, raw: json, error: null };
  }
  return { ok: false, data: null, raw: json, error: result.error };
}

/** Reads every puzzle file; never throws — failed reads are marked `ok: false`. */
export function readAllPuzzleFiles() {
  return listPuzzleFiles().map((f) => {
    try {
      const res = readPuzzleFile(f.path);
      return { ...f, ...res };
    } catch (err) {
      return { ...f, ok: false, data: null, raw: null, error: err };
    }
  });
}

/** Formats a ZodError or thrown Error into a single readable string. */
export function formatError(error) {
  if (!error) return "(unknown error)";
  if (error.issues && Array.isArray(error.issues)) {
    return error.issues
      .map((i) => `at ${i.path.join(".") || "(root)"}: ${i.message}`)
      .join("; ");
  }
  return error.message || String(error);
}
