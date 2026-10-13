import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { AUTH_COOKIE_NAME, getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET() {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(AUTH_COOKIE_NAME)?.value;
  const session = await getSession(sessionId);

  if (!session) {
    return NextResponse.json(
      { message: "Not authenticated" },
      { status: 401 },
    );
  }

  return NextResponse.json({
    id: session.sub,
    name: session.name,
    role: session.role,
  });
}
