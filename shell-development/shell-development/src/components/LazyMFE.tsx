"use client";

import React, { useEffect, useRef, useState } from "react";
import { clientLog } from "@/lib/clientLog";

interface LazyMFEProps {
  /** Module Federation container (scope) name, e.g. "templateMfe". */
  scope: string;
  /** Exposed mount module path, e.g. "./mount". */
  module: string;
  /** URL to the remote's remoteEntry.js. */
  url: string;
  /**
   * Runtime config forwarded into the MFE's mount(). Lets the MFE resolve the
   * shared UI remote URL at runtime instead of baking it at build time.
   */
  sharedUrl?: string;
}

interface MountModule {
  mount: (el: Element, props?: Record<string, unknown>) => void;
  unmount: (el: Element) => void;
}

const containerPromises = new Map<string, Promise<MfeContainer>>();

/**
 * Align the remote protocol with the page protocol (avoid mixed content).
 */
function normalizeRemoteUrl(url: string): string {
  if (
    typeof window !== "undefined" &&
    window.location.protocol === "https:" &&
    url.startsWith("http://")
  ) {
    return "https:" + url.slice("http:".length);
  }
  return url;
}

async function loadRemoteContainer(
  scope: string,
  url: string,
  sharedUrl?: string,
): Promise<MfeContainer> {
  const existing = containerPromises.get(scope);
  if (existing) return existing;

  const promise = new Promise<MfeContainer>((resolve, reject) => {
    // Publish runtime config to the shared global BEFORE the MFE's
    // remoteEntry.js executes. The MFE's webpack "promise" remote for sharedUi
    // reads window.__MFE_RUNTIME__ when it is first evaluated — which can happen
    // as early as container.get("./mount"), i.e. before the MFE's own mount()
    // runs. Setting it here (same window) guarantees the correct shared URL is
    // in place no matter when the promise remote is evaluated. Without this the
    // promise fell back to the baked localhost:9000 dev default.
    if (typeof window !== "undefined") {
      const w = window as unknown as {
        __MFE_RUNTIME__?: { sharedUrl?: string; shellUrl?: string };
      };
      w.__MFE_RUNTIME__ = {
        ...w.__MFE_RUNTIME__,
        ...(sharedUrl ? { sharedUrl } : {}),
        shellUrl: window.location.origin,
      };
    }

    const element = document.createElement("script");
    element.src = normalizeRemoteUrl(url);
    element.type = "text/javascript";
    element.async = true;
    // Load cross-origin so real error messages surface instead of the opaque
    // "Script error." (the remote dev server sends Access-Control-Allow-Origin).
    element.crossOrigin = "anonymous";

    element.onload = async () => {
      const container = (window as Record<string, unknown>)[
        scope
      ] as MfeContainer | undefined;
      if (!container) {
        reject(new Error(`Container ${scope} not found`));
        return;
      }
      try {
        // The shell is a Next.js (Turbopack) app, not a webpack host, so there
        // is no webpack share scope. The MFE bundles its own React and mounts
        // its own root, so an empty share scope is correct here.
        let shareScope: unknown = {};
        if (typeof __webpack_init_sharing__ === "function") {
          await __webpack_init_sharing__("default");
          shareScope = __webpack_share_scopes__?.default ?? {};
        }
        const initResult = container.init(shareScope);
        if (
          initResult &&
          typeof (initResult as Promise<void>).then === "function"
        ) {
          await initResult;
        }
        resolve(container);
      } catch (err) {
        reject(err as Error);
      }
    };
    element.onerror = () => reject(new Error(`Failed to load ${url}`));
    document.head.appendChild(element);
  });

  containerPromises.set(scope, promise);
  return promise;
}

/**
 * Loads a Module Federation remote that exposes a `mount(el)/unmount(el)` API
 * and renders it into a shell-owned DOM node. The MFE renders with its OWN
 * React root, so the shell's React and the MFE's React never share a
 * reconciler (prevents the two-React "Script error").
 */
export const LazyMFE: React.FC<LazyMFEProps> = ({
  scope,
  module,
  url,
  sharedUrl,
}) => {
  const hostRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const host = hostRef.current;

    if (!url) {
      const err = new Error("Remote URL belum dikonfigurasi.");
      clientLog({
        level: "error",
        category: "LOAD_MFE",
        event: "MFE_URL_MISSING",
        service: `MFE:${scope}`,
        app: scope,
        message: "Remote URL kosong — periksa MFE_<APP>_URL di env shell.",
      });
      setError(err);
      setLoading(false);
      return;
    }
    if (!host) return;

    let mountModule: MountModule | null = null;
    const startedAt = Date.now();

    clientLog({
      category: "LOAD_MFE",
      event: "MFE_LOAD_START",
      service: `MFE:${scope}`,
      app: scope,
      url,
      message: `Memuat remote ${scope}/${module}`,
    });

    loadRemoteContainer(
      scope,
      url,
      sharedUrl ? normalizeRemoteUrl(sharedUrl) : undefined,
    )
      .then((container) => container.get(module))
      .then((factory) => {
        if (!active || !host) return;
        const mod = factory() as unknown as Partial<MountModule> & {
          default?: Partial<MountModule>;
        };
        const api = (
          typeof mod.mount === "function" ? mod : mod.default
        ) as MountModule | undefined;
        if (!api || typeof api.mount !== "function") {
          throw new Error(`Remote ${scope} does not expose a mount() function`);
        }
        mountModule = api;
        // Pass runtime config into the MFE. The MFE sets window.__MFE_RUNTIME__
        // before rendering its shared cards, so the shared remoteEntry URL is
        // resolved at runtime (not baked into the MFE build). shellUrl is the
        // shell's own origin (for the MFE's standalone links, harmless here).
        api.mount(host, {
          sharedUrl: sharedUrl ? normalizeRemoteUrl(sharedUrl) : undefined,
          shellUrl:
            typeof window !== "undefined" ? window.location.origin : undefined,
        });
        setLoading(false);
        clientLog({
          category: "LOAD_MFE",
          event: "MFE_MOUNT_OK",
          service: `MFE:${scope}`,
          app: scope,
          url,
          durationMs: Date.now() - startedAt,
          message: `Remote ${scope} ter-mount`,
        });
      })
      .catch((err: Error) => {
        if (!active) return;
        console.error(`[LazyMFE] Failed to load ${scope}/${module}:`, err);
        clientLog({
          level: "error",
          category: "LOAD_MFE",
          event: "MFE_LOAD_FAIL",
          service: `MFE:${scope}`,
          app: scope,
          url,
          durationMs: Date.now() - startedAt,
          message: `Gagal memuat remote ${scope}: ${err.message}`,
        });
        setError(err);
        setLoading(false);
      });

    return () => {
      active = false;
      // Dispose the MFE's React root so its effects clean up.
      if (mountModule && host) {
        try {
          mountModule.unmount(host);
        } catch (err) {
          console.error(`[LazyMFE] unmount ${scope} failed:`, err);
        }
      }
    };
  }, [scope, module, url, sharedUrl]);

  if (error) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: 300,
          textAlign: "center",
          padding: 32,
        }}
      >
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: "50%",
            background: "#fee2e2",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 16,
            color: "#ef4444",
            fontSize: 20,
          }}
        >
          !
        </div>
        <h3 style={{ margin: "0 0 8px", color: "#111827" }}>
          Module Tidak Tersedia
        </h3>
        <p style={{ margin: 0, color: "#6b7280", fontSize: 14 }}>
          Pastikan MFE &quot;{scope}&quot; sedang berjalan.
        </p>
        {/* Surface the real error so deploy issues are diagnosable without
            opening the console (share-scope, chunk load, CORS, etc.). */}
        <pre
          style={{
            marginTop: 16,
            maxWidth: 640,
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
            background: "#fef2f2",
            border: "1px solid #fecaca",
            borderRadius: 8,
            padding: 12,
            fontSize: 12,
            color: "#7f1d1d",
            textAlign: "left",
          }}
        >
          {error.message}
        </pre>
      </div>
    );
  }

  return (
    <div style={{ position: "relative", minHeight: 200 }}>
      {loading && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            minHeight: 200,
          }}
        >
          <i
            className="pi pi-spin pi-spinner"
            style={{ fontSize: 28, color: "#4f46e5" }}
          />
        </div>
      )}
      {/* The MFE mounts its own React root into this node. */}
      <div ref={hostRef} />
    </div>
  );
};

export default LazyMFE;
