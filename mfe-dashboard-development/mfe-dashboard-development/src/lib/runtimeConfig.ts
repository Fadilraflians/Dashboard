// Runtime configuration bridge.
//
// Some values (the shared UI remote URL, the shell URL) must come from the
// deployment environment (OCP secrets) at RUNTIME, not be baked into the
// bundle at build time. The webpack build has no env, so baking them produced
// wrong localhost defaults in production.
//
// Instead the bundle reads these from a global `window.__MFE_RUNTIME__` that is
// populated before any Module Federation shared import runs:
//   - Standalone mode: bootstrap.tsx fetches the BFF `/api/runtime-config`
//     (same origin) and calls setRuntimeConfig().
//   - Shell mode: the shell passes the values into mount(el, props) and
//     mount.tsx calls setRuntimeConfig() before rendering.

export interface MfeRuntimeConfig {
  /** URL of the shared UI remoteEntry.js (sharedUi). */
  sharedUrl: string;
  /** Base URL of the shell (for standalone "open portal" links). */
  shellUrl: string;
}

declare global {
  interface Window {
    __MFE_RUNTIME__?: Partial<MfeRuntimeConfig>;
  }
}

const DEFAULTS: MfeRuntimeConfig = {
  sharedUrl: "http://localhost:9000/remoteEntry.js",
  shellUrl: "http://localhost:3000",
};

/** Merge resolved values into the runtime global (shell or standalone sets this). */
export function setRuntimeConfig(cfg: Partial<MfeRuntimeConfig>): void {
  if (typeof window === "undefined") return;
  window.__MFE_RUNTIME__ = { ...window.__MFE_RUNTIME__, ...cfg };
}

/** Read a resolved runtime value, falling back to the dev default. */
export function getRuntimeConfig(): MfeRuntimeConfig {
  const w = typeof window !== "undefined" ? window.__MFE_RUNTIME__ : undefined;
  return {
    sharedUrl: w?.sharedUrl || DEFAULTS.sharedUrl,
    shellUrl: w?.shellUrl || DEFAULTS.shellUrl,
  };
}

/**
 * Standalone bootstrap: fetch the BFF runtime config (same origin as the MFE)
 * and populate the global. Safe to call once before rendering. Never throws —
 * on failure the dev defaults apply.
 */
export async function loadRuntimeConfig(): Promise<void> {
  try {
    const res = await fetch("/api/runtime-config", {
      headers: { Accept: "application/json" },
    });
    if (res.ok) {
      const data = (await res.json()) as Partial<MfeRuntimeConfig>;
      setRuntimeConfig(data);
    }
  } catch {
    // Ignore — getRuntimeConfig() falls back to dev defaults.
  }
}
