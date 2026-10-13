import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  AUTH_COOKIE_NAME,
  COOKIE_SECURE,
  MFE_COOKIE_NAME,
  SESSION_TTL_SECONDS,
  getSession,
} from "@/lib/session";
import type { MfeContextCookie } from "@/types";

export const dynamic = "force-dynamic";

/**
 * Sets the `mfe_context` cookie that remote MFEs can read on the client side.
 *
 * This cookie is intentionally NOT HttpOnly so the loaded micro-frontend can
 * read `document.cookie` (or parse it) to know which app/user context it is
 * running in. It carries no secret — the real session stays in the HttpOnly
 * `shell_session` cookie.
 */
export async function POST(request: NextRequest) {
  const cookieStore = await cookies();
  const session = await getSession(cookieStore.get(AUTH_COOKIE_NAME)?.value);

  if (!session) {
    return NextResponse.json(
      { message: "Not authenticated" },
      { status: 401 },
    );
  }

  let body: { app?: string };
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const app = body.app || "dashboardBok";

  const context: MfeContextCookie = {
    userId: session.sub,
    name: session.name,
    role: session.role,
    app,
    ts: Date.now(),
  };

  const response = NextResponse.json({ ok: true, app });

  response.cookies.set(MFE_COOKIE_NAME, JSON.stringify(context), {
    httpOnly: false, // readable by the MFE on the client
    secure: COOKIE_SECURE,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });

  return response;
}
