/**
 * build.mjs — Build wrapper that handles the Windows static-export phantom-file
 * bug gracefully.
 *
 * Problem: On Windows with real-time antivirus (Windows Defender), the
 * `_not-found` chunk can become a "phantom" file — it appears in directory
 * listings (existsSync returns true, statSync returns a size) but cannot be
 * read (readFileSync throws ENOENT). This causes `next build` with
 * `output: 'export'` to fail at the copyfile step.
 *
 * Solution: This wrapper first tries `next build` with static export enabled
 * (the default, required for production/CI). If it fails specifically with the
 * `_not-found` copyfile error, it retries with GTG_SKIP_EXPORT=true, which
 * produces a non-export build (`.next/` only, no `out/`). This allows local
 * type-checking, linting, and build verification to pass on Windows.
 *
 * CI/Vercel (Linux) builds are unaffected — the first `next build` succeeds.
 */
import { execSync } from "node:child_process";
import { rmSync, existsSync, readdirSync, readFileSync } from "node:fs";

const CWD = process.cwd();
const NEXT_DIR = `${CWD}/.next`;
const OUT_DIR = `${CWD}/out`;

function cleanBuildArtifacts() {
  for (const dir of [NEXT_DIR, OUT_DIR]) {
    if (existsSync(dir)) {
      try {
        rmSync(dir, { recursive: true, force: true, maxRetries: 3, retryDelay: 500 });
      } catch {
        // Best-effort clean; stale files will be overwritten by next build.
      }
    }
  }
}

function runBuild(env = {}) {
  try {
    execSync("next build", {
      stdio: "pipe",
      cwd: CWD,
      env: { ...process.env, ...env },
    });
  } catch (error) {
    // Forward captured output so the user sees the full build log.
    const stdout = error.stdout?.toString() ?? "";
    const stderr = error.stderr?.toString() ?? "";
    if (stdout) process.stdout.write(stdout);
    if (stderr) process.stderr.write(stderr);
    throw error;
  }
}

function hasPhantomFiles() {
  const notFoundDir = `${NEXT_DIR}/static/chunks/app/_not-found`;
  if (!existsSync(notFoundDir)) return false;
  try {
    const files = readdirSync(notFoundDir);
    for (const file of files) {
      const p = `${notFoundDir}/${file}`;
      try {
        readFileSync(p);
      } catch {
        // File exists in directory listing but cannot be read → phantom.
        return true;
      }
    }
  } catch {
    // Directory itself is inaccessible.
    return true;
  }
  return false;
}

function isPhantomFileError(error) {
  const stderr = String(error?.stderr ?? "");
  const msg = String(error?.message ?? "");
  const text = stderr + msg;
  if (text.includes("_not-found") && text.includes("copyfile")) return true;
  // Fallback: check for actual phantom files on disk.
  if (hasPhantomFiles()) return true;
  return false;
}

console.log("[build] Starting production build (with static export)...\n");

try {
  cleanBuildArtifacts();
  runBuild();
  console.log("\n[build] Static export build completed successfully.");
} catch (error) {
  if (isPhantomFileError(error)) {
    console.log("\n[build] Static export failed due to Windows NTFS phantom-file bug.");
    console.log("[build] (Antivirus locks the _not-found chunk; CI/Linux builds are unaffected.)");
    console.log("[build] Retrying without export for local verification...\n");
    cleanBuildArtifacts();
    try {
      runBuild({ GTG_SKIP_EXPORT: "true" });
      console.log("\n[build] Non-export build completed (local verification mode).");
      console.log("[build] Production static export will run correctly on Vercel/CI.");
    } catch (retryError) {
      console.error("\n[build] Build failed even without export. See error above.");
      process.exitCode = 1;
      throw retryError;
    }
  } else {
    console.error("\n[build] Build failed with an unrelated error.");
    process.exitCode = 1;
    throw error;
  }
}
