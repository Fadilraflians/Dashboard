import React from "react";
import { createRoot, type Root } from "react-dom/client";
import { PrimeReactProvider } from "primereact/api";
import { BrowserRouter } from "react-router-dom";
import DashboardPage from "./dashboard/page";
import { MfeErrorBoundary } from "./MfeErrorBoundary";
import { ContextProvider } from "../context";
import { setRuntimeConfig } from "../lib/runtimeConfig";

import "primereact/resources/themes/lara-light-indigo/theme.css";
import "primereact/resources/primereact.min.css";
import "primeicons/primeicons.css";
import "primeflex/primeflex.css";
import "../global.css";

/**
 * Module Federation mount API (exposed as `./mount`).
 *
 * This MFE provides the content for ONE shell menu (Dashboard). The shell owns
 * the header + sidebar and renders this remote's bare content inside its own
 * layout, so the MFE no longer has an internal sidebar of its own.
 *
 * The shell calls `mount(el)` with a plain DOM node and this MFE renders its
 * OWN React tree into it via its OWN `createRoot`. Because the MFE uses a
 * separate React root (not the shell's reconciler), the shell's React
 * (Next.js) and this MFE's React never collide — which is what caused the
 * "Script error" when the MFE was rendered as a shared React component.
 *
 * The shell must call `unmount(el)` when it removes the container so the root
 * is disposed and effects are cleaned up.
 */

const roots = new Map<Element, Root>();

export interface MountProps {
  /** URL of the shared UI remoteEntry.js, provided by the shell at runtime. */
  sharedUrl?: string;
  /** Shell base URL, provided by the shell at runtime. */
  shellUrl?: string;
  [key: string]: unknown;
}

export function mount(el: Element, props?: MountProps): void {
  if (!el) return;

  // The shell resolves these from its own runtime env and passes them in. Set
  // them BEFORE rendering so the lazy shared-remote import (which runs when the
  // cards first render) reads the correct URL from the runtime global.
  if (props?.sharedUrl || props?.shellUrl) {
    setRuntimeConfig({
      ...(props.sharedUrl ? { sharedUrl: props.sharedUrl } : {}),
      ...(props.shellUrl ? { shellUrl: props.shellUrl } : {}),
    });
  }

  // Reuse an existing root for this element if present (avoids double-mount).
  let root = roots.get(el);
  if (!root) {
    root = createRoot(el);
    roots.set(el, root);
  }

  root.render(
    <MfeErrorBoundary>
      <PrimeReactProvider>
        <BrowserRouter>
          <ContextProvider>
            <DashboardPage />
          </ContextProvider>
        </BrowserRouter>
      </PrimeReactProvider>
    </MfeErrorBoundary>,
  );
}

export function unmount(el: Element): void {
  const root = roots.get(el);
  if (root) {
    root.unmount();
    roots.delete(el);
  }
}

// Default export so the loader can also do `factory().mount` conveniently.
export default { mount, unmount };
