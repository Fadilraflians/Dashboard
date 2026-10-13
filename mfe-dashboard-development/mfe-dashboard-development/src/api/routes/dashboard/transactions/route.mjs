import { proxyToGateway, methodFor } from "../../../lib/gateway.mjs";

// Endpoint: /api/dashboard/transactions — thin route.
const SERVICE = "dashboardTransactions";
export const method = methodFor(SERVICE);

export function handler(req, res) {
  return proxyToGateway(req, res, { service: SERVICE });
}
