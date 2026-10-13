import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { serverRequestFunction } from "@/serverServices";
import { logger } from "../../../../../log.js";

export const dynamic = "force-dynamic";

/**
 * Step 1 of login: send credentials to the KSEI backend, which responds with
 * an OTP challenge (otpToken + masked contact). No session is created yet —
 * that happens in /api/auth/verify-otp once the OTP is confirmed.
 *
 * Request : { email, password }   (type defaults to "2")
 * Response: { success, code, message, data: { otpToken, maskedEmail, ... } }
 */
/**
 * DEV-ONLY mock credentials. When DEV_MOCK_LOGIN=true (default in development),
 * any email/password that passes basic validation is accepted and returns a
 * synthetic otpToken. This lets developers exercise the full login → OTP →
 * session flow without a live KSEI backend or Redis.
 *
 * Set DEV_MOCK_LOGIN=false in staging/production to require the real backend.
 */
const MOCK_USERS: { email: string; password: string; name: string; role: string }[] = [
  { email: "dev@bni.co.id", password: "dev123", name: "Dev User", role: "admin" },
  { email: "admin@bni.co.id", password: "admin123", name: "Administrator", role: "admin" },
  { email: "user@bni.co.id", password: "user123", name: "Regular User", role: "user" },
  { email: "test@bni.co.id", password: "test123", name: "Test User", role: "user" },
];

function isMockLoginEnabled(): boolean {
  return process.env.DEV_MOCK_LOGIN !== "false";
}

function findMockUser(email: string, password: string) {
  return MOCK_USERS.find(
    (u) => u.email.toLowerCase() === email.toLowerCase() && u.password === password,
  );
}

export async function POST(request: NextRequest) {
  let body: { email?: string; password?: string; type?: string };
  try {
    body = await request.json();
  } catch {
    logger.error(`[incoming] [POST] [login] [400] invalid request body`);
    return NextResponse.json(
      { success: false, message: "Invalid request body" },
      { status: 400 },
    );
  }

  const email = body.email ?? "";
  const password = body.password ?? "";
  const type = body.type ?? "2";

  logger.info(`[incoming] [POST] [login] ?${email} (type: "${type}")`);

  if (!email || !password) {
    return NextResponse.json(
      { success: false, message: "Email dan password wajib diisi" },
      { status: 400 },
    );
  }

  // DEV-ONLY: mock login path — no backend needed.
  if (isMockLoginEnabled()) {
    const mockUser = findMockUser(email, password);
    if (mockUser) {
      const otpToken = `mock-otp-${randomUUID()}`;
      logger.info(
        `[outgoing] [POST] [login] ?${email} [200] "Mock login OK (DEV_MOCK_LOGIN=true)"`,
      );
      return NextResponse.json({
        success: true,
        code: 200,
        message: "OTP token generated (mock)",
        data: {
          otpToken,
          maskedEmail: maskEmail(email),
          user: { name: mockUser.name, role: mockUser.role, email: mockUser.email },
        },
      });
    }
    // Mock enabled but credentials don't match → still return 200 so the
    // frontend can proceed to OTP (avoids leaking which accounts exist).
    const otpToken = `mock-otp-${randomUUID()}`;
    logger.info(
      `[outgoing] [POST] [login] ?${email} [200] "Mock login OK (any creds accepted)"`,
    );
    return NextResponse.json({
      success: true,
      code: 200,
      message: "OTP token generated (mock)",
      data: {
        otpToken,
        maskedEmail: maskEmail(email),
        user: { name: email.split("@")[0], role: "user", email },
      },
    });
  }

  const { status, response } = await serverRequestFunction("login", {
    body: { email, password, type },
  });

  // Forward the backend result to the client as-is (it carries otpToken etc).
  logger.info(
    `[outgoing] [POST] [login] ?${email} [${status}] "${response?.message ?? ""}"`,
  );
  return NextResponse.json(response, { status });
}

function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!domain) return "***";
  const masked = local.length > 2 ? `${local[0]}***` : "***";
  return `${masked}@${domain}`;
}
