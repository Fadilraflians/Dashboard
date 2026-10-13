// Client-side service registry aggregator.
//
// Add a new API domain by creating src/services/<domain>/index.ts exporting
// its mapping/urls/mocks, then registering it here. Everything else
// (useApiService, ClientUrlMap, mocks) reads from this aggregator.

import type { RolesServiceMapping } from "./roles";
import { rolesUrls, rolesMocks } from "./roles";

// Merge all domain mappings into one. mfe-b only owns the Roles domain; the
// Dashboard domain belongs to mfe-a.
export interface ServiceMapping extends RolesServiceMapping {}

export type ServiceKey = keyof ServiceMapping;

// serviceKey -> BFF path.
export const CLIENT_URL_MAP: Record<ServiceKey, string> = {
  ...rolesUrls,
};

/**
 * Resolves the browser-facing URL for a service.
 *
 * The MFE runs inside the shell, so API calls must be SAME-ORIGIN as the shell
 * to carry the HttpOnly session cookie. We call `/mfe-api/<APP_KEY>/<path>`;
 * the shell proxies that to this MFE's BFF (`/api/<path>`), relaying the
 * cookie. In standalone dev the webpack devServer proxies `/mfe-api` to the
 * BFF too (see webpack.config.cjs). `__APP_KEY__` is injected at build time.
 */
declare const __APP_KEY__: string;

export function getApiUrl(serviceKey: ServiceKey): string {
  const domainPath = (CLIENT_URL_MAP[serviceKey] ?? "").replace(/^\/api\//, "");
  return `/mfe-api/${__APP_KEY__}/${domainPath}`;
}

// serviceKey -> mock response (only domains that define one).
export const MOCK_RESPONSES = {
  ...rolesMocks,
} as const;

// Re-export domain types for convenience.
export type {
  RoleListRequest,
  RoleRow,
  RoleListResponse,
} from "./roles";
