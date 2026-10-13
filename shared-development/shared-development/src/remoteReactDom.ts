/**
 * remoteReactDom.ts — exposed by sharedUi as "./reactdom"
 *
 * Registers window.__sharedUiRender / __sharedUiUnmount so the shell can
 * render any sharedUi component into an isolated DOM node using sharedUi's
 * OWN React + ReactDOM. Because sharedUi is compiled with eager:true for
 * both react and react-dom, every import in this file and in every chart
 * widget resolves to the SAME React instance — no hook-call collision.
 */

import { createRoot } from "react-dom/client";
import React from "react";

export { createRoot };
export default { createRoot, React };

if (typeof window !== "undefined") {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const w = window as any;

  /**
   * Mount or update a sharedUi component into `host`.
   * Re-calling with the same host re-renders with new props (no new root).
   */
  w.__sharedUiRender = (
    host: Element,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Component: React.ComponentType<any>,
    props: Record<string, unknown>,
  ) => {
    // Unmount and discard any existing root on this host before creating a new
    // one. This is critical when the same <div> is reused for a different
    // component type — React will NOT switch component type in an existing root,
    // so we must create a fresh root each time the component changes.
    const existing = host.__sharedUiRoot;
    if (existing) {
      try { existing.unmount(); } catch { /* ignore */ }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (host as any).__sharedUiRoot;
    }

    const root = createRoot(host);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (host as any).__sharedUiRoot = root;
    root.render(React.createElement(Component, props));
  };

  w.__sharedUiUnmount = (host: Element) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const root = (host as any).__sharedUiRoot as ReturnType<typeof createRoot> | undefined;
    if (root) {
      root.unmount();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (host as any).__sharedUiRoot;
    }
  };
}

// Augment Element type to hold the root reference
declare global {
  interface Element {
    __sharedUiRoot?: ReturnType<typeof createRoot>;
  }
}
