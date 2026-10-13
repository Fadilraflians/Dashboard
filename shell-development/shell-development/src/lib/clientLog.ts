/**
 * Client-side logger (shell).
 *
 * Fire-and-forget reporter that POSTs micro-frontend lifecycle events to the
 * shell's /api/client-log sink, which writes them via winston in the shared
 * 9-bracket format. Use this to trace MFE / Shared load + mount problems in
 * server logs during deployment.
 *
 * Design notes:
 *  - Never throws and never blocks the UI (errors are swallowed).
 *  - Uses sendBeacon when available (survives page unload), else fetch.
 *  - De-dupes identical events within a short window to avoid log spam from
 *    React re-renders / retries.
 */

export type ClientLogLevel = "info" | "warn" | "error";

/** Log category — the top-level filter tag ([CAT:...]) in each log line. */
export type ClientLogCategory =
  | "FETCH_API"
  | "SHELL"
  | "LOAD_MFE"
  | "LOAD_SHARED";

export interface ClientLogEvent {
  level?: ClientLogLevel;
  /** Category tag written as [CAT:...] for easy grepping. */
  category: ClientLogCategory;
  /** Short event code, e.g. "MFE_MOUNT_OK", "MFE_LOAD_FAIL". */
  event: string;
  /** Origin service tag: "MFE:dashboardBok" | "SHARED:sharedUi" | "SHELL". */
  service: string;
  /** remoteEntry.js URL involved (key for deployment debugging). */
  url?: string;
  /** Sidebar menu / app key. */
  app?: string;
  /** Human-readable detail. */
  message?: string;
  /** Operation duration in ms. */
  durationMs?: number;
}

const ENDPOINT = "/api/client-log";
const DEDUP_WINDOW_MS = 2000;
const recent = new Map<string, number>();

function dedupKey(e: ClientLogEvent): string {
  return `${e.level ?? "info"}|${e.category}|${e.event}|${e.service}|${e.app ?? ""}|${e.url ?? ""}`;
}

export function clientLog(event: ClientLogEvent): void {
  if (typeof window === "undefined") return;

  const key = dedupKey(event);
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
    // sendBeacon is best for unload-safety, but it can't set JSON content-type
    // reliably across browsers; use a Blob to hint the type.
    if (navigator.sendBeacon) {
      const blob = new Blob([body], { type: "application/json" });
      const ok = navigator.sendBeacon(ENDPOINT, blob);
      if (ok) return;
    }
    void fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
    }).catch(() => {
      /* logging must never break the app */
    });
  } catch {
    /* swallow */
  }
}
