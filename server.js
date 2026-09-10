// server.js - Unified server running BOTH Frontend (19985) & Backend Relay (8080)
import { join } from "path";
import { handleRelayRequest } from "./relay.js";

const FRONTEND_PORT = parseInt(process.env.PORT || "19985", 10);
const BACKEND_PORT = parseInt(process.env.A0_RELAY_PORT || "8080", 10);
const DIST_DIR = join(import.meta.dir, "dist");

// 1. Frontend Server (port 19985): serves static UI + relay routes
const frontendServer = Bun.serve({
  port: FRONTEND_PORT,
  async fetch(req) {
    // Check relay endpoints first
    const relayResponse = await handleRelayRequest(req);
    if (relayResponse) {
      return relayResponse;
    }

    // Serve static frontend files
    const url = new URL(req.url);
    let pathname = decodeURIComponent(url.pathname);
    if (pathname === "/" || pathname === "") {
      pathname = "/index.html";
    }

    const filePath = join(DIST_DIR, pathname);
    const file = Bun.file(filePath);
    if (await file.exists()) {
      return new Response(file);
    }

    // SPA fallback
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

console.log(`[Frontend + API] Running at http://localhost:${frontendServer.port}`);

// 2. Dedicated Backend Relay Server (port 8080)
if (BACKEND_PORT !== FRONTEND_PORT) {
  try {
    const backendServer = Bun.serve({
      port: BACKEND_PORT,
      async fetch(req) {
        const url = new URL(req.url);
        if (url.pathname === '/' && url.searchParams.has('q')) {
          const forwardUrl = new URL(req.url);
          forwardUrl.pathname = '/search-relay';
          const forwardReq = new Request(forwardUrl.toString(), req);
          return await handleRelayRequest(forwardReq);
        }
        const relayRes = await handleRelayRequest(req);
        if (relayRes) {
          return relayRes;
        }
        return new Response(
          "Approach Zero Relay Backend is running on port " +
            BACKEND_PORT +
            ".\nEndpoints:\n- /search-relay?q=...\n- /click-relay\n",
          {
            status: 200,
            headers: { "Content-Type": "text/plain; charset=utf-8" },
          }
        );
      },
    });
    console.log(`[Backend Relay]  Running at http://localhost:${backendServer.port}`);
  } catch (err) {
    console.warn(`[Backend Relay] Could not start port ${BACKEND_PORT}: ${err.message}`);
  }
}
