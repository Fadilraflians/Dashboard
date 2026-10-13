import { randomUUID } from "crypto";
import { getRedis, keyPrefix } from "./redis";

/**
 * Reference-token (opaque session) model.
 *
 * On login the shell stores the real JWT (static for now) plus user info in
 * Redis under a random session id, and sets an HttpOnly cookie containing only
 * that session id. The JWT never reaches the browser. The gateway swaps the
 * session id for the JWT when calling the backend. Logout deletes the key, so
 * sessions can be revoked instantly.
 */

export interface SessionUser {
  sub: string; // user id / username
  name: string;
  role: string;
  email?: string;
}

export interface SessionRecord extends SessionUser {
  jwt: string; // the real backend access token (JWT from verify-otp)
  iat: number; // issued-at (epoch seconds)
}

/** HttpOnly cookie holding the opaque session id. */
export const AUTH_COOKIE_NAME = process.env.AUTH_COOKIE_NAME || "shell_session";

/**
 * Non-HttpOnly cookie the MFE remotes can read for user/app context. It
 * carries no token — only display context.
 */
export const MFE_COOKIE_NAME = "mfe_context";

export const SESSION_TTL_SECONDS = Number(process.env.SESSION_TTL || 900);

/**
 * Whether auth cookies get the `Secure` flag.
 *
 * A `Secure` cookie is ONLY sent by the browser over HTTPS. When the app is
 * deployed behind plain HTTP, a Secure cookie is never returned, so the server
 * can't read the session and bounces the user back to /login (302 loop).
 *
 * Controlled explicitly by COOKIE_SECURE (not tied to NODE_ENV):
 *   COOKIE_SECURE=false  -> HTTP deployment (cookie works over http)
 *   COOKIE_SECURE=true   -> HTTPS deployment (recommended in prod)
 * Default: false (safe for HTTP). Set true once the app is served over HTTPS.
 */
export const COOKIE_SECURE = process.env.COOKIE_SECURE === "true";

function redisKey(sessionId: string): string {
  return `${keyPrefix()}${sessionId}`;
}

/**
 * Creates a session: stores the real backend access token (JWT) + user in
 * Redis under a new session id with a TTL, and returns the session id to be
 * placed in the cookie. The JWT comes from verify-otp (KSEI) and is required.
 */
export async function createSession(
  user: SessionUser,
  jwt: string,
): Promise<string> {
  const sessionId = randomUUID();
  const record: SessionRecord = {
    ...user,
    jwt,
    iat: Math.floor(Date.now() / 1000),
  };

  const redis = await getRedis();
  await redis.set(redisKey(sessionId), JSON.stringify(record), {
    EX: SESSION_TTL_SECONDS,
  });

  return sessionId;
}

/** Returns the stored session record, or null if missing/expired/invalid. */
export async function getSession(
  sessionId: string | undefined | null,
): Promise<SessionRecord | null> {
  if (!sessionId) return null;

  try {
    const redis = await getRedis();
    const raw = await redis.get(redisKey(sessionId));
    if (!raw) return null;
    return JSON.parse(raw) as SessionRecord;
  } catch (err) {
    console.error("[session] getSession failed:", err);
    return null;
  }
}

/** Deletes a session (logout / revoke). */
export async function destroySession(
  sessionId: string | undefined | null,
): Promise<void> {
  if (!sessionId) return;
  try {
    const redis = await getRedis();
    await redis.del(redisKey(sessionId));
  } catch (err) {
    console.error("[session] destroySession failed:", err);
  }
}
