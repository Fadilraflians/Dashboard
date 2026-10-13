import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { AUTH_COOKIE_NAME, getSession } from "@/lib/session";
// Root winston logger (9-bracket format). allowJs=true lets us import the .js.
import { logger } from "../../../../log.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Client log sink (BFF).
 *
 * Browser code (shell LazyMFE/MenuMfeHost, and the MFEs via same-origin POST)
 * reports micro-frontend lifecycle events here. We write them through the
 * shell's winston logger in the SAME 9-bracket format as API logs, so MFE /
 * Shared load problems are traceable in logs/*.log during deployment.
 *
 * The formatter parses these slots from the message string:
 *   [flow] [METHOD] [service] [status] [message] [duration]
 * We emit: flow=incoming, service=<MFE:scope|SHARED:scope|SHELL>,
 *          status=<EVENT code>, message=<details + url + context>, duration=<ms>.
 * The user tag (@name / ?name) is prefixed so logs attribute to the user.
 */

type ClientLevel = "info" | "warn" | "error";

interface ClientLogBody {
  level?: ClientLevel;
  /** Category tag ([CAT:...]): FETCH_API | SHELL | LOAD_MFE | LOAD_SHARED. */
  category?: string;
  /** Short event code, e.g. MFE_MOUNT_OK, MFE_LOAD_FAIL, SHARED_CARD_FAIL. */
  event?: string;
  /** Origin service: "MFE:dashboardBok", "SHARED:sharedUi", "SHELL". */
  service?: string;
  /** remoteEntry.js URL involved (critical for deployment debugging). */
  url?: string;
  /** Sidebar menu / app key for context. */
  app?: string;
  /** Human-readable detail. */
  message?: string;
  /** Load/op duration in ms. */
  durationMs?: number;
  /** Runtime env reported by the client (development/production). */
  env?: string;
}

const LEVELS: ReadonlyArray<ClientLevel> = ["info", "warn", "error"];
const CATEGORIES = ["FETCH_API", "SHELL", "LOAD_MFE", "LOAD_SHARED"];
const MAX_LEN = 500;

function clamp(v: unknown, max = MAX_LEN): string {
  if (typeof v !== "string") return "";
  return v.length > max ? v.slice(0, max) : v;
}

/** Allow only safe chars in the service slot so the formatter parses it. */
function safeService(v: unknown): string {
  const s = clamp(v, 64).replace(/[^A-Za-z0-9_:-]/g, "");
  return s || "SHELL";
}

/** Event code -> a bracket token the formatter keeps in the status slot. */
function safeEvent(v: unknown): string {
  return clamp(v, 48).replace(/[^A-Za-z0-9_-]/g, "") || "CLIENT_EVENT";
}

export async function POST(request: NextRequest) {
  let body: ClientLogBody;
  try {
    body = (await request.json()) as ClientLogBody;
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const level: ClientLevel = LEVELS.includes(body.level as ClientLevel)
    ? (body.level as ClientLevel)
    : "info";

  // Attribute to the logged-in user if there is a session (best-effort).
  let userTag = "?anon";
  try {
    const cookieStore = await cookies();
    const session = await getSession(cookieStore.get(AUTH_COOKIE_NAME)?.value);
    if (session) userTag = `@${session.sub}`;
  } catch {
    /* no session context — keep ?anon */
  }

  const service = safeService(body.service);
  const event = safeEvent(body.event);
  const category = CATEGORIES.includes(body.category as string)
    ? (body.category as string)
    : "SHELL";
  const env = clamp(body.env, 16).replace(/[^A-Za-z0-9_-]/g, "") || "unknown";

  // Build the message slot: detail + url + env (url in <> renders as a link in
  // the colored console formatter and is easy to grep in files).
  const parts: string[] = [];
  if (body.message) parts.push(clamp(body.message));
  if (body.app) parts.push(`app=${clamp(body.app, 48)}`);
  if (body.url) parts.push(`<${clamp(body.url, 300)}>`);
  parts.push(`env=${env}`);
  const message = parts.join(" ");

  const duration =
    typeof body.durationMs === "number" && isFinite(body.durationMs)
      ? ` [${Math.max(0, Math.round(body.durationMs))}ms]`
      : "";

  // Final line: [CAT:...] category tag first (grep-friendly), then the
  // 9-bracket slots. user prefix attributes to the session; flow=incoming
  // marks a client->server report; [client] distinguishes browser events.
  const line = `[CAT:${category}] ${userTag} [incoming] [${service}] [${event}] [client] ${message}${duration}`;

  if (level === "error") logger.error(line);
  else if (level === "warn") logger.warn(line);
  else logger.info(line);

  return NextResponse.json({ ok: true });
}
