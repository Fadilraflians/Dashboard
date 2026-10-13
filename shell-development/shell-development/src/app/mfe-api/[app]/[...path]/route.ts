import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { AUTH_COOKIE_NAME } from "@/lib/session";

export const dynamic = "force-dynamic";

/**
 * MFE API proxy (browser-facing, same-origin).
 *
 * When an MFE is embedded in the shell, its browser code calls
 * `/mfe-api/<app>/<path>` (same origin as the shell), avoiding cross-origin
 * cookie problems. This route forwards the request to that MFE's BFF
 * (`BFF_<APP>_URL`), relaying the HttpOnly `shell_session` cookie so the BFF
 * can resolve the token from Redis. The BFF then calls the shell gateway.
 *
 *   browser -> shell /mfe-api/<app>/<path>  (cookie sent, same origin)
 *           -> MFE BFF /api/<path>          (cookie relayed)
 *           -> shell gateway -> backend
 */

function resolveBff(app: string): string | null {
  // Per-MFE BFF URL, grouped like the other MFE_<APP>_* vars.
  const key = `MFE_${app.toUpperCase()}_BFF_URL`;
  return process.env[key] || process.env.BFF_URL || null;
}

async function handle(
  request: NextRequest,
  ctx: { params: Promise<{ app: string; path?: string[] }> },
) {
  const { app, path } = await ctx.params;

  const bff = resolveBff(app);
  if (!bff) {
    return NextResponse.json(
      { success: false, message: `No BFF configured for app "${app}"` },
      { status: 501 },
    );
  }

  // Rebuild the BFF path: /api/<path>
  const suffix = (path ?? []).join("/");
  const search = request.nextUrl.search || "";
  const targetUrl = `${bff.replace(/\/$/, "")}/api/${suffix}${search}`;

  // Relay the session cookie so the BFF can read it (same name).
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(AUTH_COOKIE_NAME)?.value;
  const cookieHeader = sessionId ? `${AUTH_COOKIE_NAME}=${sessionId}` : "";

  const method = request.method;
  const hasBody = !["GET", "HEAD"].includes(method);

  try {
    const upstream = await fetch(targetUrl, {
      method,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        ...(cookieHeader ? { Cookie: cookieHeader } : {}),
      },
      body: hasBody ? await request.text() : undefined,
    });

    const text = await upstream.text();
    return new NextResponse(text, {
      status: upstream.status,
      headers: {
        "content-type":
          upstream.headers.get("content-type") || "application/json",
      },
    });
  } catch (err) {
    console.error(`[mfe-api] ${app} -> ${targetUrl} failed:`, err);
    return NextResponse.json(
      { success: false, message: "MFE BFF unavailable" },
      { status: 502 },
    );
  }
}

export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const PATCH = handle;
export const DELETE = handle;
