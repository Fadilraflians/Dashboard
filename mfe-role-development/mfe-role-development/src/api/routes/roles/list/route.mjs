import { proxyToGateway, methodFor } from "../../../lib/gateway.mjs";

// Endpoint: /api/roles/list — thin route; endpoint/method live in ServerUrlMap.
const SERVICE = "roleList";
export const method = methodFor(SERVICE);

export function handler(req, res) {
  return proxyToGateway(req, res, { service: SERVICE });
}
