import { proxyToGateway, methodFor } from "../../../lib/gateway.mjs";

// Endpoint: /api/dashboard/summary — thin route.
const SERVICE = "dashboardSummary";
export const method = methodFor(SERVICE);

export function handler(req, res) {
  return proxyToGateway(req, res, { service: SERVICE });
}
