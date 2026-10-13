import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { serverRequestFunction } from "@/serverServices";
import { AUTH_COOKIE_NAME, getSession } from "@/lib/session";
import { logger } from "../../../../../log.js";

export const dynamic = "force-dynamic";

/**
 * Returns the authenticated user's profile from the KSEI backend.
 * No request body; the Bearer token is taken from the Redis session.
 */
export async function GET() {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(AUTH_COOKIE_NAME)?.value;
  const session = await getSession(sessionId);

  if (!session) {
    logger.warn(`[incoming] [GET] [profile] [401] no session`);
    return NextResponse.json(
      { success: false, message: "Not authenticated" },
      { status: 401 },
    );
  }

  const userTag = session.email ?? session.name;
  logger.info(`[incoming] [GET] [profile] @${userTag}`);

  const { status, response } = await serverRequestFunction("profile", {
    token: session.jwt,
    user: userTag,
  });

  logger.info(
    `[outgoing] [GET] [profile] @${userTag} [${status}] "${response?.message ?? ""}"`,
  );
  return NextResponse.json(response, { status });
}
