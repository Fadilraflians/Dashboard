/**
 * Client-side logger (MFE).
 *
 * Fire-and-forget reporter that POSTs lifecycle events to the SHELL's
 * same-origin /api/client-log sink (the MFE runs inside the shell, so the path
 * resolves to the shell). The shell writes them via winston in the shared
 * 9-bracket format, so Shared/MFE problems are traceable in server logs.
 *
 * In standalone MFE dev (its own port) /api/client-log does not exist and the
 * POST simply fails silently — logging must never affect the app.
 */

export type ClientLogLevel = "info" | "warn" | "error";

export type ClientLogCategory =
  | "FETCH_API"
  | "SHELL"
  | "LOAD_MFE"
  | "LOAD_SHARED";

export interface ClientLogEvent {
  level?: ClientLogLevel;
  /** Category tag ([CAT:...]) for grepping. */
  category: ClientLogCategory;
  event: string;
  /** Origin service tag, e.g. "SHARED:sharedUi" | "MFE:dashboardBok". */
  service: string;
  url?: string;
  app?: string;
  message?: string;
  durationMs?: number;
}

const ENDPOINT = "/api/client-log";
const DEDUP_WINDOW_MS = 2000;
const recent = new Map<string, number>();

export function clientLog(event: ClientLogEvent): void {
  if (typeof window === "undefined") return;

  const key = `${event.level ?? "info"}|${event.category}|${event.event}|${event.service}|${event.app ?? ""}|${event.url ?? ""}`;
  const now = Date.now();
  const last = recent.get(key);
  if (last && now - last < DEDUP_WINDOW_MS) return;
  recent.set(key, now);

  const payload = {
    level: event.level ?? "info",
    category: event.category,
    event: event.event,
    service: event.service,
    url: event.url,
    app: event.app,
    message: event.message,
    durationMs: event.durationMs,
    env: process.env.NODE_ENV ?? "unknown",
  };

  try {
    const body = JSON.stringify(payload);
    if (navigator.sendBeacon) {
      const blob = new Blob([body], { type: "application/json" });
      if (navigator.sendBeacon(ENDPOINT, blob)) return;
    }
    void fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
    }).catch(() => {
      /* never break the app */
    });
  } catch {
    /* swallow */
  }
}
