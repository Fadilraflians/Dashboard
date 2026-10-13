// Service registry (trimmed from template-bgn). Maps a logical service key to
// its backend endpoint/method and its request/response shapes. The shell talks
// to a single backend (the KSEI API gateway), so there is no multi-service
// BASE_URL map here — just one base URL.

export type FetchMethod = "POST" | "GET" | "PUT" | "DELETE" | "PATCH";

export interface ServiceUrlAndMethod {
  urlEndpoint: string;
  method: FetchMethod;
  /** If true, `urlEndpoint` is used as-is (not prefixed with the base URL). */
  useAbsoluteUrl?: boolean;
}

// ─── Request / response shapes per service ───

export interface LoginRequest {
  email: string;
  password: string;
  type: string;
}

export interface LoginResponse {
  success: boolean;
  code?: string;
  message?: string;
  data?: {
    otpToken?: string;
    maskedEmail?: string;
    maskedPhone?: string;
    otpExpiresIn?: number;
  } | null;
  meta?: unknown;
}

export interface VerifyOtpRequest {
  otpToken: string;
  otpCode: string;
}

export interface VerifyOtpResponse {
  success: boolean;
  code?: string;
  message?: string;
  data?: {
    accessToken?: string;
  } | null;
  meta?: unknown;
}

export interface ProfileResponse {
  success: boolean;
  code?: string;
  message?: string;
  data?: {
    userId?: string;
    email?: string;
    name?: string;
    role?: string;
    type?: string;
    permissions?: string;
  } | null;
  meta?: unknown;
}

export interface LogoutRequest {
  userId: string;
}

export interface LogoutResponse {
  success: boolean;
  code?: string;
  message?: string;
  data?: unknown;
  meta?: unknown;
}

export interface ServiceMapping {
  login: { body: LoginRequest; response: LoginResponse };
  verifyOtp: { body: VerifyOtpRequest; response: VerifyOtpResponse };
  profile: { body?: undefined; response: ProfileResponse };
  logout: { body: LogoutRequest; response: LogoutResponse };
}

export type ServiceKey = keyof ServiceMapping;

export interface CustomRequestInit<T extends ServiceKey>
  extends Omit<RequestInit, "method" | "body"> {
  body?: ServiceMapping[T]["body"];
  queryParams?: Record<string, string>;
  pathParams?: Record<string, string>;
  /** Extra bearer token override (login/verify-otp need none). */
  token?: string;
}
