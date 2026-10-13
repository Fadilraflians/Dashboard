import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { serverRequestFunction } from "@/serverServices";
import {
  AUTH_COOKIE_NAME,
  MFE_COOKIE_NAME,
  destroySession,
  getSession,
} from "@/lib/session";
import { logger } from "../../../../../log.js";

export const dynamic = "force-dynamic";

/**
 * Logs out: calls the KSEI backend logout (Bearer + userId from the session),
 * then revokes the local Redis session and clears cookies. Backend failure is
 * non-fatal — we still clear the local session so the user is logged out here.
 */
export async function POST() {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(AUTH_COOKIE_NAME)?.value;
  const session = await getSession(sessionId);

  if (session?.jwt && session.sub) {
    const userTag = session.email ?? session.name;
    logger.info(`[incoming] [POST] [logout] @${userTag}`);
    const { status, response } = await serverRequestFunction("logout", {
      token: session.jwt,
      user: userTag,
      body: { userId: session.sub },
    });
    logger.info(
      `[outgoing] [POST] [logout] @${userTag} [${status}] "${response?.message ?? ""}"`,
    );
  }

  // Revoke the local session in Redis so the id can never be reused.
  await destroySession(sessionId);

  const response = NextResponse.json({ success: true, message: "Logged out" });
  response.cookies.set(AUTH_COOKIE_NAME, "", { path: "/", maxAge: 0 });
  response.cookies.set(MFE_COOKIE_NAME, "", { path: "/", maxAge: 0 });
  return response;
}
