import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { serverRequestFunction } from "@/serverServices";
import {
  AUTH_COOKIE_NAME,
  COOKIE_SECURE,
  SESSION_TTL_SECONDS,
  createSession,
} from "@/lib/session";
import { parseJwt } from "@/lib/jwt";
import { logger } from "../../../../../log.js";

export const dynamic = "force-dynamic";

/**
 * Returns true when this is a mock OTP token issued by the dev login mock.
 * When true we skip the backend and create the session locally.
 */
function isMockOtp(otpToken: string): boolean {
  return otpToken.startsWith("mock-otp-");
}

/**
 * Step 2 of login: verify the OTP. On success the KSEI backend returns the
 * real access token (JWT). We store it in Redis under a new opaque session id
 * and set that id as the HttpOnly cookie. The JWT never reaches the browser.
 *
 * Request : { otpToken, otpCode }
 * Response: { success, code, message } (+ Set-Cookie on success)
 */
export async function POST(request: NextRequest) {
  let body: { otpToken?: string; otpCode?: string };
  try {
    body = await request.json();
  } catch {
    logger.error(`[incoming] [POST] [verifyOtp] [400] invalid request body`);
    return NextResponse.json(
      { success: false, message: "Invalid request body" },
      { status: 400 },
    );
  }

  const otpToken = body.otpToken ?? "";
  const otpCode = body.otpCode ?? "";

  logger.info(`[incoming] [POST] [verifyOtp]`);

  if (!otpToken || !otpCode) {
    return NextResponse.json(
      { success: false, message: "otpToken dan otpCode wajib diisi" },
      { status: 400 },
    );
  }

  // DEV-ONLY: mock OTP path — accept any code >= 4 digits when the token is a mock.
  if (isMockOtp(otpToken)) {
    if (otpCode.length < 4) {
      return NextResponse.json(
        { success: false, message: "OTP code must be at least 4 digits" },
        { status: 400 },
      );
    }
    // Build a synthetic JWT-like token so the rest of the flow (session,
    // cookie, profile, me) works unchanged.
    const mockUser = {
      sub: `mock-user-${randomUUID().slice(0, 8)}`,
      name: "Dev User",
      email: "dev@bni.co.id",
      role: "admin",
    };
    const accessToken = buildMockJwt(mockUser);

    let sessionId: string;
    try {
      sessionId = await createSession(
        {
          sub: mockUser.sub,
          name: mockUser.name,
          role: mockUser.role,
          email: mockUser.email,
        },
        accessToken,
      );
    } catch (err) {
      logger.error(`[verifyOtp] session create failed: ${err}`);
      return NextResponse.json(
        { success: false, message: "Gagal membuat sesi. Periksa keterangan Redis." },
        { status: 503 },
      );
    }

    logger.info(`[outgoing] [POST] [verifyOtp] @${mockUser.email} [200] "Mock login succeeds"`);

    const res = NextResponse.json({
      success: true,
      message: "Login Success (mock)",
      user: { id: mockUser.sub, name: mockUser.name, role: mockUser.role },
    });
    res.cookies.set(AUTH_COOKIE_NAME, sessionId, {
      httpOnly: true,
      secure: COOKIE_SECURE,
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_TTL_SECONDS,
    });
    return res;
  }

  const { status, response } = await serverRequestFunction("verifyOtp", {
    body: { otpToken, otpCode },
  });

  const accessToken = response?.data?.accessToken;
  if (status < 200 || status >= 300 || !response?.success || !accessToken) {
    logger.warn(
      `[outgoing] [POST] [verifyOtp] [${status || 401}] "${response?.message ?? "OTP tidak valid"}"`,
    );
    return NextResponse.json(response ?? { success: false }, {
      status: status || 401,
    });
  }

  // Derive display context from the JWT claims.
  const claims = parseJwt(accessToken);
  const user = {
    sub: claims?.sub ?? "",
    name: (claims?.name as string) ?? claims?.email ?? "user",
    role: (claims?.role as string) ?? "user",
    email: claims?.email,
  };

  let sessionId: string;
  try {
    sessionId = await createSession(user, accessToken);
  } catch (err) {
    logger.error(`@${user.email ?? user.name} [verifyOtp] session create failed: ${err}`);
    return NextResponse.json(
      { success: false, message: "Gagal membuat sesi. Periksa keterangan Redis." },
      { status: 503 },
    );
  }

  logger.info(
    `[outgoing] [POST] [verifyOtp] @${user.email ?? user.name} [${status}] "Login Success"`,
  );

  const res = NextResponse.json({
    success: true,
    message: response.message ?? "Login Success",
    user: { id: user.sub, name: user.name, role: user.role },
  });
  res.cookies.set(AUTH_COOKIE_NAME, sessionId, {
    httpOnly: true,
    secure: COOKIE_SECURE,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
  return res;
}

/**
 * Build a fake JWT (header.payload.signature) with the given claims.
 * The signature is random — it is never verified by the shell (the backend
 * already validated), so this is safe for local development.
 */
function buildMockJwt(payload: {
  sub: string;
  name: string;
  email: string;
  role: string;
}): string {
  const header = Buffer.from(
    JSON.stringify({ alg: "HS256", typ: "JWT" }),
  ).toString("base64url");
  const now = Math.floor(Date.now() / 1000);
  const body = Buffer.from(
    JSON.stringify({
      ...payload,
      iat: now,
      exp: now + 86400,
    }),
  ).toString("base64url");
  const sig = randomUUID().replace(/-/g, "");
  return `${header}.${body}.${sig}`;
}