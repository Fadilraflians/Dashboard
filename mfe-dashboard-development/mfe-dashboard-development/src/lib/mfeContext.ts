export interface MfeContext {
  userId: string;
  name: string;
  role: string;
  app: string;
  ts: number;
}

/**
 * Reads the non-HttpOnly `mfe_context` cookie that the shell sets when the
 * user opens this app. The shell owns authentication; this cookie only tells
 * the MFE which user/app context it is running in (it carries no token).
 * Returns null when running standalone (no shell) or when absent/invalid.
 */
export function getMfeContext(): MfeContext | null {
  if (typeof document === "undefined") return null;

  const match = document.cookie.match(/(?:^|;\s*)mfe_context=([^;]+)/);
  if (!match) return null;

  try {
    return JSON.parse(decodeURIComponent(match[1])) as MfeContext;
  } catch {
    return null;
  }
}
