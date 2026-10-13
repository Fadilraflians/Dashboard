import { ENV_TYPES } from "./env-types.js";

// Maps each env var to { required, type|pattern, description }.
// Priority: explicit `pattern` > `type`.

export const envSchema = {
  // --- Server ---
  SERVER_PORT: {
    required: false,
    type: "number",
    description: "Port the custom Node server listens on.",
  },
  NODE_ENV: {
    required: false,
    type: "node-env",
    description: "Node environment.",
  },
  LOG_LEVEL: {
    required: false,
    type: "string",
    description: "Winston log level.",
  },

  // --- Auth (reference-token session) ---
  AUTH_COOKIE_NAME: {
    required: false,
    type: "string",
    description: "Name of the HttpOnly cookie holding the opaque session id.",
  },
  SESSION_TTL: {
    required: false,
    type: "number",
    description: "Session lifetime in seconds (also the Redis key TTL).",
  },
  COOKIE_SECURE: {
    required: false,
    type: "boolean",
    description: "Secure flag on auth cookies. false for HTTP, true for HTTPS.",
  },
  API_BASE_URL: {
    required: true,
    type: "url",
    description: "Base URL of the backend API gateway (login/verify-otp).",
  },

  // --- Redis / Valkey (session store) ---
  REDIS_HOST: {
    required: true,
    type: "host",
    description: "Redis/Valkey host.",
  },
  REDIS_PORT: {
    required: true,
    type: "number",
    description: "Redis/Valkey port.",
  },
  REDIS_USERNAME: {
    required: false,
    type: "string",
    description: "Redis username (default: default).",
  },
  REDIS_PASSWORD: {
    required: false,
    type: "string",
    description: "Redis password (empty if the instance has no auth).",
  },
  REDIS_KEY_PREFIX: {
    required: false,
    type: "string",
    description: "Prefix applied to every session key.",
  },

  // --- Backend (gateway target) ---
  BACKEND_URL: {
    required: false,
    type: "url-optional",
    description: "Default upstream backend (used when no per-MFE override).",
  },

  // --- MFE: DashboardBOK (app key: dashboardBok) ---
  // All config for one MFE is grouped under MFE_<APP>_*. The gateway picks the
  // backend by the MFE's APP_KEY: MFE_<APP uppercased>_BACKEND_URL.
  MFE_DASHBOARDBOK_SCOPE: {
    required: false,
    type: "string",
    description: "Module Federation container (scope) name of DashboardBOK.",
  },
  MFE_DASHBOARDBOK_MODULE: {
    required: false,
    type: "string",
    description: "Exposed module path of DashboardBOK (e.g. ./mount).",
  },
  MFE_DASHBOARDBOK_URL: {
    required: false,
    type: "url",
    description: "URL to the DashboardBOK remoteEntry.js.",
  },
  MFE_DASHBOARDBOK_BACKEND_URL: {
    required: false,
    type: "url-optional",
    description: "Backend base URL for DashboardBOK (gateway app=dashboardBok).",
  },
  MFE_DASHBOARDBOK_BFF_URL: {
    required: false,
    type: "url-optional",
    description: "BFF URL for DashboardBOK (shell /mfe-api/dashboardBok proxy target).",
  },

  // --- MFE: Role Management (app key: roleMgmt) ---
  MFE_ROLEMGMT_SCOPE: {
    required: false,
    type: "string",
    description: "Module Federation container (scope) name of Role Management.",
  },
  MFE_ROLEMGMT_MODULE: {
    required: false,
    type: "string",
    description: "Exposed module path of Role Management (e.g. ./mount).",
  },
  MFE_ROLEMGMT_URL: {
    required: false,
    type: "url",
    description: "URL to the Role Management remoteEntry.js.",
  },
  MFE_ROLEMGMT_BACKEND_URL: {
    required: false,
    type: "url-optional",
    description: "Backend base URL for Role Management (gateway app=roleMgmt).",
  },
  MFE_ROLEMGMT_BFF_URL: {
    required: false,
    type: "url-optional",
    description: "BFF URL for Role Management (shell /mfe-api/roleMgmt proxy target).",
  },
};

export { ENV_TYPES };
