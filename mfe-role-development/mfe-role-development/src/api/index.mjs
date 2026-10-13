import { fileURLToPath } from "url";
import { dirname, resolve } from "path";
import dotenv from "dotenv";
import express from "express";
import cookieParser from "cookie-parser";
import { logger } from "./log.mjs";
import { registerRoutes } from "./loader.mjs";
import { getSession, isRedisReady } from "./lib/redis.mjs";
import {
  API_PORT,
  APP_KEY,
  SHELL_GATEWAY_URL,
  SHARED_URL,
  SHELL_ORIGINS,
  DIST_DIR,
} from "./lib/env.mjs";

// Load the single project-root .env (BFF runs from src/api/).
const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, "../../.env") });

/**
 * MFE BFF (serverside of this micro-frontend).
 *
 * Uses Next-like file-based routing: endpoints live in
 * `routes/<domain>/<action>/route.mjs` and are auto-mounted by the loader.
 * Each route forwards to the shell gateway via lib/gateway.mjs (Bearer token
 * from Redis). Logs use the shared 9-bracket structured format.
 */

const app = express();

/**
 * CORS for cross-origin asset loading.
 *
 * In deployment the shell loads this MFE's remoteEntry.js from a DIFFERENT
 * origin, so the browser requires Access-Control-Allow-Origin on those
 * responses. We echo the request Origin back only if it is in the
 * SHELL_ORIGINS allowlist, and answer preflight (OPTIONS).
 */
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && SHELL_ORIGINS.includes(origin.replace(/\/$/, ""))) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader(
      "Access-Control-Allow-Methods",
      "GET,POST,PUT,PATCH,DELETE,OPTIONS",
    );
    res.setHeader(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization",
    );
  }
  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }
  next();
});

app.use(cookieParser());
app.use(express.json());

// Serve the built client assets (remoteEntry.js + chunks) with the CORS
// headers above, so the shell can load the remote cross-origin.
//
// Cache strategy: stable-named files (remoteEntry.js, index.html) must always
// revalidate (`no-cache`) so a new deploy is picked up; hashed chunks are
// immutable (safe to cache a year since the name changes on content change).
app.use(
  express.static(DIST_DIR, {
    setHeaders: (res, filePath) => {
      const file = filePath.replace(/\\/g, "/");
      if (file.endsWith("/remoteEntry.js") || file.endsWith("/index.html")) {
        res.setHeader("Cache-Control", "no-cache");
      } else {
        res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
      }
    },
  }),
);

// Health + session are infrastructure endpoints (not file-based routes).
app.get("/api/health", (_req, res) => {
  res.json({ ok: true, redis: isRedisReady(), app: APP_KEY });
});

// RUNTIME config for the browser bundle. Values are read from process.env at
// REQUEST time (OCP secrets), so the shared remote URL + shell URL can change
// without rebuilding the bundle.
app.get("/api/runtime-config", (_req, res) => {
  res.setHeader("Cache-Control", "no-cache");
  res.json({ sharedUrl: SHARED_URL, shellUrl: SHELL_GATEWAY_URL });
});

app.get("/api/session", async (req, res) => {
  const session = await getSession(req);
  if (!session?.jwt) {
    return res.status(401).json({ authorized: false });
  }
  return res.json({ authorized: true, user: { name: session.user } });
});

// Auto-mount all routes/<domain>/<action>/route.mjs, then start.
registerRoutes(app)
  .then(() => {
    // Fallback 404 for unknown /api/* paths.
    app.all(/^\/api\/.+/, (req, res) => {
      logger.warn(`[incoming] [${req.method}] [${req.path}] [404] unknown route`);
      res
        .status(404)
        .json({ success: false, message: `Unknown route: ${req.path}` });
    });

    // SPA fallback: any non-API GET serves index.html (standalone access).
    app.get(/^(?!\/api\/).*/, (_req, res) => {
      res.setHeader("Cache-Control", "no-cache");
      res.sendFile(resolve(DIST_DIR, "index.html"), (err) => {
        if (err) res.status(404).end();
      });
    });

    app.listen(API_PORT, () => {
      logger.info(`[process] [BFF] listening on <http://localhost:${API_PORT}>`);
      logger.info(
        `[process] [BFF] shell gateway: <${SHELL_GATEWAY_URL}> app: ${APP_KEY}`,
      );
    });
  })
  .catch((err) => {
    logger.error(`[process] [BFF] failed to register routes: ${err?.message ?? err}`);
    process.exit(1);
  });
