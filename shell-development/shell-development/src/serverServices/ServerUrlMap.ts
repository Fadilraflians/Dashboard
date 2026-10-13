import type { ServiceKey, ServiceUrlAndMethod } from "./ServiceType";

/**
 * Backend endpoint map (key -> { urlEndpoint, method }). Mirrors template-bgn's
 * SERVER_URL_MAP. Endpoints are relative to API_BASE_URL (the KSEI gateway).
 */
export const SERVER_URL_MAP: Record<ServiceKey, ServiceUrlAndMethod> = {
  login: { urlEndpoint: "/api/auth/login", method: "POST" },
  verifyOtp: { urlEndpoint: "/api/auth/verify-otp", method: "POST" },
  profile: { urlEndpoint: "/api/auth/profile", method: "GET" },
  logout: { urlEndpoint: "/api/auth/logout", method: "POST" },
};
