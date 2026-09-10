// server.js - Fast static file server powered by Bun.serve
import { join } from "path";

const PORT = parseInt(process.env.PORT || "19985", 10);
const DIST_DIR = join(import.meta.dir, "dist");

const server = Bun.serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url);
    let pathname = decodeURIComponent(url.pathname);

    // Default to index.html for root
    if (pathname === "/" || pathname === "") {
      pathname = "/index.html";
    }

    const filePath = join(DIST_DIR, pathname);
    const file = Bun.file(filePath);

    if (await file.exists()) {
      return new Response(file);
    }

    // SPA fallback: return index.html if file doesn't exist
    const indexFile = Bun.file(join(DIST_DIR, "index.html"));
    if (await indexFile.exists()) {
      return new Response(indexFile, {
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }

    return new Response("Not Found. Please run `bun run build` first.", {
      status: 404,
    });
  },
});

console.log(`[ui-approach0] Bun static server running at http://localhost:${server.port}`);
