/** @type {import('next').NextConfig} */
const nextConfig = {
  // Full static export — produces an `out/` directory with no server runtime.
  // Required by ADR-001 and architecture.md §1 (no database, no runtime backend).
  //
  // On Windows, real-time antivirus (Windows Defender) can create "phantom" files
  // in the `_not-found` chunk that appear in directory listings but cannot be
  // read, causing the export copyfile step to fail with ENOENT. This is an
  // environment issue, not a Next.js bug — CI/Vercel (Linux) builds are unaffected.
  //
  // The `build` npm script (scripts/build.mjs) detects this failure and retries
  // without export for local verification. Set GTG_SKIP_EXPORT=true to skip
  // export explicitly (used by the fallback).
  output: process.env.GTG_SKIP_EXPORT === "true" ? undefined : "export",
  images: { unoptimized: true },
  trailingSlash: true,
  reactStrictMode: true,
};

export default nextConfig;
