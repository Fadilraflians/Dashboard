import { createClient } from "redis";
import { logger } from "../log.mjs";
import { AUTH_COOKIE_NAME, REDIS_KEY_PREFIX } from "./env.mjs";

// ---- Redis (read-only) ------------------------------------------------------
// The BFF only READS session tokens from Redis (the shell writes them on
// login). Keep these read-only credentials server-side only.

let redisClient = null;
let redisReady = false;

function buildRedis() {
  const client = createClient({
    socket: {
      host: process.env.REDIS_HOST || "127.0.0.1",
      port: Number(process.env.REDIS_PORT || 6379),
      connectTimeout: 5000,
      reconnectStrategy: (retries) =>
        retries > 3 ? false : Math.min(retries * 200, 1000),
    },
    username: process.env.REDIS_USERNAME || undefined,
    password: process.env.REDIS_PASSWORD || undefined,
  });
  client.on("error", (err) => {
    redisReady = false;
    logger.error(`[process] [Redis] error: ${err?.message ?? err}`);
  });
  client.on("ready", () => {
    redisReady = true;
  });
  return client;
}

export async function getRedis() {
  if (redisClient?.isOpen) return redisClient;
  redisClient = redisClient ?? buildRedis();
  if (!redisClient.isOpen) {
    await redisClient.connect();
  }
  return redisClient;
}

export function isRedisReady() {
  return redisReady;
}

/** Reads { jwt, user } for the current session from Redis, or null. */
export async function getSession(req) {
  const sessionId = req.cookies?.[AUTH_COOKIE_NAME];
  if (!sessionId) return null;
  try {
    const client = await getRedis();
    const raw = await client.get(`${REDIS_KEY_PREFIX}${sessionId}`);
    if (!raw) return null;
    const record = JSON.parse(raw);
    return {
      jwt: record?.jwt ?? null,
      user: record?.email ?? record?.name ?? "",
    };
  } catch (err) {
    logger.error(`[process] [Redis] getSession failed: ${err?.message ?? err}`);
    return null;
  }
}
