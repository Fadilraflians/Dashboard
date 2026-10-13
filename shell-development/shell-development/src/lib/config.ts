import type { AppConfig } from "@/types";

let cached: AppConfig | null = null;

/**
 * Loads the app config (MFE remote URLs) from the shell BFF once and caches it.
 */
export async function loadConfig(): Promise<AppConfig> {
  if (cached) return cached;

  const res = await fetch("/api/config");
  if (!res.ok) {
    throw new Error("Failed to load app config");
  }
  cached = (await res.json()) as AppConfig;
  return cached;
}
