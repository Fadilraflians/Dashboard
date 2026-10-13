import { NextRequest, NextResponse } from "next/server";
import { logger } from "../../../../../../log.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Gateway — pure forwarder.
 *
 * An MFE's own BFF resolves the session token from Redis and calls this
 * endpoint with `Authorization: Bearer <jwt>`. The gateway does NOT look at
 * Redis, does NOT read cookies, and does NOT verify the JWT — it only routes
 * the request to the backend configured for <app> and passes the token
 * through. The backend is responsible for validating the JWT.
 *
 * Responsibility split:
 *   - MFE BFF  : session cookie -> token (Redis readonly)
 *   - gateway  : app -> backend routing + forward (this file)
 *   - backend  : validate JWT, authorize, respond
 */

/**
 * Resolves the backend base URL for an app key. Each MFE's backend is grouped
 * under `MFE_<APP>_BACKEND_URL` (e.g. MFE_DASHBOARDBOK_BACKEND_URL), falling
 * back to the shared `BACKEND_URL`. Only keys that resolve to a configured URL
 * are allowed, preventing arbitrary/forged app keys from reaching unknown
 * hosts.
 */
function resolveBackend(app: string): string | null {
  const key = `MFE_${app.toUpperCase()}_BACKEND_URL`;
  return process.env[key] || process.env.BACKEND_URL || null;
}

async function handle(
  request: NextRequest,
  ctx: { params: Promise<{ app: string; path?: string[] }> },
) {
  const { app, path } = await ctx.params;

  const method = request.method;
  const suffix = (path ?? []).join("/");
  const backend = resolveBackend(app);

  // Which env var the base URL came from (so you can see pointing config).
  const backendEnvKey = `MFE_${app.toUpperCase()}_BACKEND_URL`;
  const baseSource = process.env[backendEnvKey]
    ? backendEnvKey
    : process.env.BACKEND_URL
      ? "BACKEND_URL"
      : "(none)";

  if (!backend) {
    // No backend wired yet → let the caller fall back to mock data.
    logger.warn(
      `[CAT:FETCH_API] [outgoing] [${method}] [GATEWAY:${app}] [501] ` +
        `"no backend configured" base=${baseSource}=<empty> path=/${suffix}`,
    );
    return NextResponse.json(
      { message: `No backend configured for app "${app}"` },
      { status: 501 },
    );
  }

  const search = request.nextUrl.search || "";
  const base = backend.replace(/\/$/, "");
  const targetUrl = `${base}/${suffix}${search}`;

  const hasBody = !["GET", "HEAD"].includes(method);

  // Pass the caller's Authorization header straight through (the token the
  // MFE BFF fetched from Redis). The gateway does not inspect or verify it.
  const authorization = request.headers.get("authorization") ?? "";

  const start = Date.now();
  // Log the base URL + full target so you can verify the pointing is correct.
  logger.info(
    `[CAT:FETCH_API] [request] [${method}] [GATEWAY:${app}] ` +
      `base=${baseSource}=<${base}> target=<${targetUrl}>`,
  );

  try {
    const upstream = await fetch(targetUrl, {
      method,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        ...(authorization ? { Authorization: authorization } : {}),
      },
      body: hasBody ? await request.text() : undefined,
    });

    const text = await upstream.text();
    const contentType =
      upstream.headers.get("content-type") || "application/json";
    const duration = Date.now() - start;

    const line =
      `[CAT:FETCH_API] [response] [${method}] [GATEWAY:${app}] ` +
      `[${upstream.status}] target=<${targetUrl}> [${duration}ms]`;
    if (upstream.ok) logger.info(line);
    else logger.error(line);

    return new NextResponse(text, {
      status: upstream.status,
      headers: { "content-type": contentType },
    });
  } catch (err) {
    const duration = Date.now() - start;
    logger.error(
      `[CAT:FETCH_API] [response] [${method}] [GATEWAY:${app}] [502] ` +
        `target=<${targetUrl}> "${err instanceof Error ? err.message : String(err)}" [${duration}ms]`,
    );
    return NextResponse.json(
      { message: "Backend unavailable" },
      { status: 502 },
    );
  }
}

export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const PATCH = handle;
export const DELETE = handle;
