import { logger } from "../log.mjs";
import { getSession } from "./redis.mjs";
import { APP_KEY, SHELL_GATEWAY_URL } from "./env.mjs";
import { SERVER_URL_MAP } from "../ServerUrlMap.mjs";

/**
 * Forwards a request to the shell gateway, which routes to the real backend.
 *
 *   browser (MFE) -> BFF route -> this helper
 *       -> Redis (readonly: sessionId -> jwt)
 *       -> shell gateway /api/gateway/<APP_KEY>/<urlEndpoint>  (Bearer jwt)
 *       -> backend
 *
 * Route files only pass a `service` key; the endpoint/method/mock are resolved
 * from the central SERVER_URL_MAP (template-bgn style). Emits the shared
 * 9-bracket structured logs: [incoming] / [request] / [response] / [outgoing].
 */
export async function proxyToGateway(req, res, { service }) {
  const entry = SERVER_URL_MAP[service];
  if (!entry) {
    logger.error(`[process] [${service}] [500] service not in SERVER_URL_MAP`);
    return res
      .status(500)
      .json({ success: false, message: `Unknown service: ${service}` });
  }

  const { urlEndpoint, method = "GET", mock = null } = entry;

  const session = await getSession(req);
  const token = session?.jwt ?? "";
  const u = session?.user ? ` @${session.user}` : "";

  logger.info(`[CAT:FETCH_API] [incoming] [${method}] [${service}]${u}`);

  if (!token) {
    if (mock) {
      logger.info(
        `[CAT:FETCH_API] [outgoing] [${method}] [${service}]${u} [200] "mock (no session)"`,
      );
      return res.json(mock);
    }
    logger.warn(
      `[CAT:FETCH_API] [outgoing] [${method}] [${service}]${u} [401] "no session"`,
    );
    return res
      .status(401)
      .json({ success: false, message: "Not authenticated" });
  }

  const targetUrl = `${SHELL_GATEWAY_URL}/api/gateway/${APP_KEY}/${urlEndpoint}`;
  const hasBody = !["GET", "HEAD"].includes(method);
  const start = Date.now();

  // base = shell gateway; target = full URL (so you can verify the pointing).
  logger.info(
    `[CAT:FETCH_API] [request] [${method}] [${service}]${u} base=SHELL_GATEWAY_URL=<${SHELL_GATEWAY_URL}> target=<${targetUrl}>`,
  );

  try {
    const upstream = await fetch(targetUrl, {
      method,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: hasBody ? JSON.stringify(req.body ?? {}) : undefined,
    });

    const duration = Date.now() - start;

    if (upstream.status === 501 && mock) {
      logger.info(
        `[CAT:FETCH_API] [response] [${method}] [${service}]${u} [501] "no backend -> mock" target=<${targetUrl}> [${duration}ms]`,
      );
      return res.json(mock);
    }

    const text = await upstream.text();
    let message = "";
    try {
      message = JSON.parse(text)?.message ?? "";
    } catch {
      /* non-JSON */
    }

    if (upstream.ok) {
      logger.info(
        `[CAT:FETCH_API] [response] [${method}] [${service}]${u} [${upstream.status}] "${message}" target=<${targetUrl}> [${duration}ms]`,
      );
    } else {
      logger.error(
        `[CAT:FETCH_API] [response] [${method}] [${service}]${u} [${upstream.status}] "${message}" target=<${targetUrl}> [${duration}ms]`,
      );
    }

    res
      .status(upstream.status)
      .set(
        "content-type",
        upstream.headers.get("content-type") || "application/json",
      )
      .send(text);
  } catch (err) {
    const duration = Date.now() - start;
    logger.error(
      `[CAT:FETCH_API] [response] [${method}] [${service}]${u} [502] target=<${targetUrl}> "${err?.message ?? err}" [${duration}ms]`,
    );
    if (mock) return res.json(mock);
    res.status(502).json({ success: false, message: "Gateway unavailable" });
  }
}

/** Looks up the HTTP method for a service (used by route files to export it). */
export function methodFor(service) {
  return SERVER_URL_MAP[service]?.method ?? "GET";
}
