// Client-side service registry aggregator.
//
// Add a new API domain by creating src/services/<domain>/index.ts exporting
// its mapping/urls/mocks, then registering it here. Everything else
// (useApiService, ClientUrlMap, mocks) reads from this aggregator.

import type { DashboardServiceMapping } from "./dashboard";
import { dashboardUrls, dashboardMocks } from "./dashboard";

// Merge all domain mappings into one. mfe-a only owns the Dashboard domain;
// the Roles domain belongs to mfe-b.
export interface ServiceMapping extends DashboardServiceMapping {}

export type ServiceKey = keyof ServiceMapping;

// serviceKey -> BFF path.
export const CLIENT_URL_MAP: Record<ServiceKey, string> = {
  ...dashboardUrls,
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
  ...dashboardMocks,
} as const;

// Re-export domain types for convenience.
export type {
  DashboardStat,
  DashboardSummaryResponse,
  TransactionRow,
  DashboardTransactionsResponse,
} from "./dashboard";
