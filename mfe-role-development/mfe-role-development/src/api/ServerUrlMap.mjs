/**
 * Central backend endpoint map (template-bgn style).
 *
 * Single source of truth for every MFE API endpoint. Route files
 * (routes/<domain>/<action>/route.mjs) stay thin — they only reference a
 * `service` key; the gateway helper looks the details up here.
 *
 * Entry shape:
 *   urlEndpoint : gateway sub-path (includes the backend's own `api/` prefix);
 *                 forwarded as /api/gateway/<APP_KEY>/<urlEndpoint>
 *   method      : HTTP method to the gateway/backend
 *   mock        : optional fallback response (served when no session / 501)
 *
 * This MFE (Role Management) only exposes role endpoints.
 */
export const SERVER_URL_MAP = {
  // ── Roles ──
  roleList: {
    urlEndpoint: "api/roles/list",
    method: "POST",
  },
};
