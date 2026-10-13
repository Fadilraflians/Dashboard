import type { FetchMethod, ServiceKey } from "./ServiceType";
import { SERVER_URL_MAP } from "./ServerUrlMap";

/** Base URL of the backend API gateway (KSEI). */
export function getBaseUrl(): string {
  const base = process.env.API_BASE_URL;
  if (!base) {
    throw new Error("API_BASE_URL is not set");
  }
  return base.replace(/\/$/, "");
}

/**
 * Resolves a service key to a fully-qualified URL + method.
 * Throws "Invalid service key" if the key is unknown (handled by the caller).
 */
export function generateServerUrl(key: ServiceKey): {
  url: string;
  method: FetchMethod;
} {
  const entry = SERVER_URL_MAP[key];
  if (!entry) {
    throw new Error("Invalid service key");
  }
  const url = entry.useAbsoluteUrl
    ? entry.urlEndpoint
    : `${getBaseUrl()}${entry.urlEndpoint}`;
  return { url, method: entry.method };
}
