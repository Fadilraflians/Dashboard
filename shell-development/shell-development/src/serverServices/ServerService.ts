import "server-only";
import { headers } from "next/headers";
import os from "node:os";
import { logger } from "../../log.js";
import { generateServerUrl } from "./ServiceCommon";
import type {
  CustomRequestInit,
  FetchMethod,
  ServiceKey,
  ServiceMapping,
} from "./ServiceType";

const FETCH_TIMEOUT_MS = 120000;
const ERROR_SERVER_MESSAGE = "Sistem Error, Mohon Hubungi Admin!";
const SENSITIVE_KEYS = [
  "password",
  "oldPassword",
  "newPassword",
  "confirmPassword",
  "token",
  "otpToken",
  "otpCode",
  "accessToken",
  "otp",
];

export interface RequestReturnValue<T> {
  status: number;
  response: T;
  /** Raw `set-cookie` header(s) from the backend response, if any. */
  setCookie?: string | null;
}

/**
 * Server-side backend request helper (trimmed from template-bgn's
 * serverRequestFunction). Resolves the URL from a service key, attaches the
 * bearer token (if provided), logs `[request]`/`[response]` in the structured
 * 9-bracket format, and normalizes the JSON response.
 */
export async function serverRequestFunction<T extends ServiceKey>(
  dataKey: T,
  options: CustomRequestInit<T> & { user?: string } = {},
): Promise<RequestReturnValue<ServiceMapping[T]["response"]>> {
  const start = Date.now();

  let ipAddress = "";
  let userAgent = "";
  try {
    const h = await headers();
    ipAddress = h.get("x-forwarded-for") ?? "";
    userAgent = h.get("user-agent") ?? "";
  } catch {
    // headers() unavailable outside a request scope — ignore.
  }
  const hostname = os.hostname();

  // User tag: " @name" authenticated, " ?name" attempt (login/verify-otp).
  const bodyUser =
    (options?.body as { email?: string } | undefined)?.email ?? "";
  const isAuthenticated = Boolean(options?.user);
  const user = options?.user || bodyUser;
  const u = user ? ` ${isAuthenticated ? "@" : "?"}${user}` : "";

  let url: string;
  let method: FetchMethod;
  try {
    const generated = generateServerUrl(dataKey);
    url = generated.url;
    method = generated.method;
  } catch (error) {
    const duration = Date.now() - start;
    logger.error(
      `[request] [${String(dataKey)}]${u} Invalid service key [${duration}ms] ${error}`,
    );
    return {
      status: 400,
      response: {
        success: false,
        message: "Invalid service key",
      } as ServiceMapping[T]["response"],
    };
  }

  // Query/path params
  const stringQueryParams = options?.queryParams
    ? new URLSearchParams(options.queryParams).toString()
    : "";
  const pathParams = options?.pathParams
    ? Object.values(options.pathParams)
        .map((p) => encodeURIComponent(p))
        .join("/")
    : "";
  const urlWithPath = pathParams ? `${url}/${pathParams}` : url;
  const fullUrl = stringQueryParams
    ? `${urlWithPath}?${stringQueryParams}`
    : urlWithPath;

  const token = options?.token ?? "";
  const hasBody = options?.body !== undefined && options?.body !== null;
  const isFormData = options?.body instanceof FormData;

  const finalHeaders: Record<string, string> = {
    ...(hasBody && !isFormData ? { "Content-Type": "application/json" } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    "User-Agent": userAgent,
    "X-Hostname": hostname,
    "X-Forwarded-For": ipAddress,
  };
  if (options?.headers) {
    for (const [k, v] of Object.entries(options.headers as Record<string, string>)) {
      finalHeaders[k] = v;
    }
  }

  const authStatus = token
    ? token.split(".").length === 3
      ? "ok"
      : "bad"
    : "none";

  // Redacted body for logging
  let bodyStr = "";
  if (method !== "GET" && hasBody && !isFormData) {
    const redacted = Object.fromEntries(
      Object.entries(options!.body as unknown as Record<string, unknown>).map(
        ([k, v]) => (SENSITIVE_KEYS.includes(k) ? [k, "***"] : [k, v]),
      ),
    );
    bodyStr = ` ${JSON.stringify(redacted)}`;
  }

  logger.info(
    `[request] [${method}] [${String(dataKey)}]${u} (auth: "${authStatus}") <${fullUrl}>${bodyStr}`,
  );

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    let requestBody: BodyInit | undefined;
    if (method !== "GET" && hasBody) {
      requestBody = isFormData
        ? (options!.body as unknown as FormData)
        : JSON.stringify(options!.body);
    }

    const response = await fetch(fullUrl, {
      method,
      body: requestBody,
      headers: finalHeaders,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    const duration = Date.now() - start;

    let data: ServiceMapping[T]["response"];
    let message = response.statusText ?? "";
    try {
      data = (await response.json()) as ServiceMapping[T]["response"];
      const m = (data as { message?: string })?.message;
      if (m) message = m;
    } catch (err) {
      logger.error(
        `[response] [${method}] [${String(dataKey)}]${u} JSON parse error: ${err}`,
      );
      return {
        status: response.status || 500,
        response: {
          success: false,
          message: ERROR_SERVER_MESSAGE,
        } as ServiceMapping[T]["response"],
      };
    }

    const setCookie = response.headers.get("set-cookie");

    if (response.ok) {
      logger.info(
        `[response] [${method}] [${String(dataKey)}]${u} [${response.status}] "${message}" [${duration}ms]${setCookie ? ` (set-cookie: "yes")` : ""}`,
      );
    } else {
      logger.error(
        `[response] [${method}] [${String(dataKey)}]${u} [${response.status}] "${message}" [${duration}ms]`,
      );
    }

    return { status: response.status, response: data, setCookie };
  } catch (error) {
    clearTimeout(timeoutId);
    const duration = Date.now() - start;
    logger.error(
      `[request] [${method}] [${String(dataKey)}]${u} [${duration}ms] ${error}`,
    );
    return {
      status: 500,
      response: {
        success: false,
        message: ERROR_SERVER_MESSAGE,
      } as ServiceMapping[T]["response"],
    };
  }
}
