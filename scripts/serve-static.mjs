/**
 * Zero-dependency static file server for serving the `out/` static export
 * during Playwright e2e tests.
 *
 * Why this exists: the production artifact is a Next.js static export in
 * `out/`. Running e2e against `next dev` (the previous setup) validated dev
 * behavior, not the shipped artifact. This server lets `playwright.config.ts`
 * serve `out/` so e2e exercises the real static output (P2-33).
 *
 * It deliberately uses only Node builtins (`http`, `fs`, `path`) so no new
 * dependency is added to package.json / package-lock.json (guardrail #3).
 *
 * Matches `trailingSlash: true` (next.config.mjs): a request to `/play/keywords/`
 * resolves to `out/play/keywords/index.html`.
 *
 * Usage: `node scripts/serve-static.mjs [port] [outDir]` (defaults: 3000, ./out)
 */
import { createServer } from "node:http";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";

const PORT = Number(process.env.PORT ?? process.argv[2] ?? 3000);
const OUT_DIR = normalize(process.argv[3] ?? join(process.cwd(), "out"));

const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8",
  ".xml": "application/xml; charset=utf-8",
  ".webmanifest": "application/manifest+json",
  ".map": "application/json; charset=utf-8",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

/** Resolve a URL pathname to a file under OUT_DIR, honoring trailingSlash. */
function resolveFile(pathname) {
  // Decode percent-encoding, guard against path traversal.
  let decoded;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    return null;
  }
  const safe = normalize(decoded).replace(/^(\.\.[/\\])+/, "");
  const base = join(OUT_DIR, safe);

  // If the path ends with "/", serve the directory's index.html.
  if (pathname.endsWith("/")) {
    const idx = join(base, "index.html");
    return existsSync(idx) ? idx : null;
  }

  // If the exact file exists, serve it.
  if (existsSync(base) && extname(base)) {
    return base;
  }

  // Try `<path>.html` and `<path>/index.html` fallbacks.
  const withHtml = `${base}.html`;
  if (existsSync(withHtml)) return withHtml;
  const dirIndex = join(base, "index.html");
  if (existsSync(dirIndex)) return dirIndex;

  return null;
}

/**
 * Path to the Next.js-generated 404 page (`out/404.html`). Served with a 404
 * status when no static file matches the request, so e2e tests and production
 * (Cloudflare Pages _routes) see the friendly 404 page — not a bare "Not found"
 * string. Resolved lazily on first miss so the path is always current.
 */
const NOT_FOUND_HTML = join(OUT_DIR, "404.html");

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url ?? "/", `http://localhost:${PORT}`);
    const file = resolveFile(url.pathname);
    if (!file) {
      // Serve the Next.js 404 page if it exists; fall back to plain text.
      if (existsSync(NOT_FOUND_HTML)) {
        const data = await readFile(NOT_FOUND_HTML);
        res.writeHead(404, {
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "no-store",
        });
        res.end(data);
        return;
      }
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Not found");
      return;
    }
    const data = await readFile(file);
    res.writeHead(200, {
      "Content-Type": MIME[extname(file)] ?? "application/octet-stream",
      "Cache-Control": "no-store",
    });
    res.end(data);
  } catch (err) {
    res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Internal server error");
    console.error("[serve-static] error:", err);
  }
});

server.listen(PORT, () => {
  console.log(`[serve-static] serving ${OUT_DIR} at http://localhost:${PORT}`);
});
