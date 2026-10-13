import { useCallback, useState } from "react";
import {
  ServiceKey,
  ServiceMapping,
  getApiUrl,
  MOCK_RESPONSES,
} from "@/services";
import { useToast } from "@/context";
import { TOAST_LIFETIME } from "@/constant";
import { NETWORK_ERROR } from "@/constant/messages/ErrorMessage";

interface ApiServiceState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

interface CallApiOptions {
  onSuccess?: (data: unknown) => void;
  onError?: (error: string) => void;
  onFinally?: () => void;
  showToast?: boolean;
}

/**
 * Client fetch hook for the MFE.
 *
 * - Calls this MFE's own BFF (same origin via the devServer proxy, or same
 *   origin when embedded). The HttpOnly session cookie rides along, and the
 *   BFF resolves the token from Redis and forwards to the shell gateway. The
 *   browser never handles a token.
 * - If the BFF is unreachable (e.g. frontend-only standalone run), it falls
 *   back to local mock data so the UI stays functional. The BFF also returns
 *   mock data itself when no backend/token is available.
 */
export function useApiService<T extends ServiceKey>(serviceKey: T) {
  const [state, setState] = useState<
    ApiServiceState<ServiceMapping[T]["response"]>
  >({
    data: null,
    loading: false,
    error: null,
  });

  const { show } = useToast();

  const callApi = useCallback(
    async (
      body?: ServiceMapping[T]["body"],
      options: CallApiOptions = {},
    ): Promise<ServiceMapping[T]["response"]> => {
      setState((prev) => ({ ...prev, loading: true, error: null }));

      // Mock may be undefined for services without a mock (e.g. roleList).
      const mock = (MOCK_RESPONSES as Record<string, unknown>)[serviceKey] as
        | ServiceMapping[T]["response"]
        | undefined;

      const useMockOrFail = (reason: string) => {
        if (mock !== undefined) {
          if (process.env.NODE_ENV !== "production") {
            // eslint-disable-next-line no-console
            console.warn(`[useApiService] ${serviceKey}: ${reason} — using mock.`);
          }
          setState({ data: mock, loading: false, error: null });
          options.onSuccess?.(mock);
          return mock;
        }
        setState((prev) => ({ ...prev, loading: false, error: reason }));
        options.onError?.(reason);
        return Promise.reject(new Error(reason));
      };

      try {
        const endpoint = getApiUrl(serviceKey);

        // POST with body when a body is provided; GET otherwise.
        const hasBody = body !== undefined && body !== null;
        const response = await fetch(endpoint, {
          method: hasBody ? "POST" : "GET",
          headers: {
            Accept: "application/json",
            ...(hasBody ? { "Content-Type": "application/json" } : {}),
          },
          credentials: "include",
          body: hasBody ? JSON.stringify(body) : undefined,
        });

        // Gateway/backend not implemented yet → fall back to mock (if any).
        if (response.status === 404 || response.status === 501) {
          return useMockOrFail(`gateway returned ${response.status}`);
        }

        const text = await response.text();
        let data: ServiceMapping[T]["response"];
        try {
          data = JSON.parse(text);
        } catch {
          return useMockOrFail("invalid JSON response");
        }

        const httpOk = response.status >= 200 && response.status < 300;
        const bodyOk = (data as { success?: boolean }).success === true;

        if (httpOk && bodyOk) {
          setState({ data, loading: false, error: null });
          options.onSuccess?.(data);
          return data;
        }

        const message =
          (data as { error?: string; message?: string }).error ??
          (data as { message?: string }).message ??
          `Permintaan gagal (${response.status})`;

        setState((prev) => ({ ...prev, loading: false, error: message }));
        if (options.showToast !== false && response.status !== 401) {
          show({
            severity: "error",
            summary: "Gagal",
            detail: message,
            life: TOAST_LIFETIME,
          });
        }
        options.onError?.(message);
        return Promise.reject(new Error(message));
      } catch {
        // Network error (e.g. standalone dev with no shell) → mock or fail.
        return useMockOrFail(NETWORK_ERROR);
      } finally {
        options.onFinally?.();
      }
    },
    [serviceKey, show],
  );

  return {
    ...state,
    callApi,
    reset: () => setState({ data: null, loading: false, error: null }),
  };
}
