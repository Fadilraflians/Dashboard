import { readdirSync, statSync } from "fs";
import { fileURLToPath, pathToFileURL } from "url";
import { dirname, resolve, join, relative, sep } from "path";
import { logger } from "./log.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROUTES_DIR = resolve(__dirname, "routes");

/** Recursively collect all files named `route.mjs` under routes/. */
function findRouteFiles(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) {
      out.push(...findRouteFiles(full));
    } else if (name === "route.mjs") {
      out.push(full);
    }
  }
  return out;
}

/**
 * Next-like file-based routing for Express.
 *
 * Each `routes/<domain>/<action>/route.mjs` is registered at
 * `/api/<domain>/<action>` using its exported `method` (default GET) and
 * `handler(req, res)`. Non-route files (e.g. mock.mjs) are ignored.
 */
export async function registerRoutes(app) {
  const files = findRouteFiles(ROUTES_DIR);

  for (const file of files) {
    const mod = await import(pathToFileURL(file).href);
    const handler = mod.handler ?? mod.default;
    if (typeof handler !== "function") {
      logger.warn(`[process] [Loader] skip (no handler): ${file}`);
      continue;
    }

    const method = String(mod.method || "GET").toLowerCase();
    // routes/dashboard/summary/route.mjs -> dashboard/summary
    const rel = relative(ROUTES_DIR, dirname(file)).split(sep).join("/");
    const urlPath = `/api/${rel}`;

    app[method](urlPath, (req, res) => handler(req, res));
    logger.info(
      `[process] [Loader] mounted [${method.toUpperCase()}] <${urlPath}>`,
    );
  }
}
