// Shared BFF constants. Loads the project-root .env HERE (before reading
// process.env) so values are correct regardless of module import order.
// (ES module imports are evaluated before index.mjs runs dotenv.config, so
// reading process.env at eval time without loading dotenv first gave defaults
// — notably an empty REDIS_KEY_PREFIX, which broke Redis key lookups.)

import { fileURLToPath } from "url";
import { dirname, resolve } from "path";
import dotenv from "dotenv";

const __dirname = dirname(fileURLToPath(import.meta.url));
// env.mjs is at src/api/lib/ -> project root is three levels up.
dotenv.config({ path: resolve(__dirname, "../../../.env") });

// Hardcoded static identity (same as the webpack MF container name).
export const APP_KEY = "roleMgmt";
export const AUTH_COOKIE_NAME = process.env.AUTH_COOKIE_NAME || "shell_session";

// RUNTIME config served to the browser via GET /api/runtime-config.
// SHARED_URL = where the shared UI remote's remoteEntry.js lives. Read at
// runtime (from the OCP secret) so the shared location can change without a
// rebuild. Defaults to the local dev shared server.
export const SHARED_URL =
  process.env.SHARED_URL || "http://localhost:9000/remoteEntry.js";
export const REDIS_KEY_PREFIX = process.env.REDIS_KEY_PREFIX || "";
export const SHELL_GATEWAY_URL = (
  process.env.SHELL_GATEWAY_URL || "http://localhost:3000"
).replace(/\/$/, "");
export const API_PORT = Number(process.env.API_PORT || 3102);

/**
 * Allowed browser origin for CORS on the served MFE assets (remoteEntry.js +
 * chunks). Always the shell's origin = SHELL_GATEWAY_URL (no separate env).
 */
export const SHELL_ORIGINS = SHELL_GATEWAY_URL.split(",")
  .map((o) => o.trim().replace(/\/$/, ""))
  .filter(Boolean);

/** Where the built client assets live (dist/ at project root). */
export const DIST_DIR = resolve(__dirname, "../../../dist");
