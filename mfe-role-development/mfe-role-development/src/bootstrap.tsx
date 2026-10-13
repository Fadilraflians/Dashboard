import React from "react";
import { createRoot } from "react-dom/client";
import { PrimeReactProvider } from "primereact/api";
import { BrowserRouter } from "react-router-dom";
import RolesPage from "./app/roles/page";
import Unauthorized from "./app/Unauthorized";
import { ContextProvider } from "./context";
import { loadRuntimeConfig } from "./lib/runtimeConfig";

import "primereact/resources/themes/lara-light-indigo/theme.css";
import "primereact/resources/primereact.min.css";
import "primeicons/primeicons.css";
import "primeflex/primeflex.css";
import "./global.css";

/**
 * Standalone entry — only runs when the MFE is opened directly (dev at
 * MFE_PORT, e.g. http://localhost:3002). When loaded inside the shell, the
 * shell uses the exposed `./mount` and this file never executes.
 *
 * A direct hit must be authenticated: we ask the BFF (`/api/session`), which
 * checks the shell session cookie against Redis. If there is no valid session
 * we render an Unauthorized page instead of the app.
 */

function render(node: React.ReactElement) {
  const container = document.getElementById("root");
  if (container) {
    createRoot(container).render(node);
  }
}

function renderApp() {
  render(
    <PrimeReactProvider>
      <BrowserRouter>
        <ContextProvider>
          <RolesPage />
        </ContextProvider>
      </BrowserRouter>
    </PrimeReactProvider>,
  );
}

async function start() {
  // Resolve runtime config (shared URL, shell URL) from the BFF before
  // rendering, so the shared-remote import and the Unauthorized link use the
  // deployment values, not the baked dev defaults.
  await loadRuntimeConfig();
  try {
    const res = await fetch("/api/session", {
      credentials: "include",
      headers: { Accept: "application/json" },
    });
    if (res.ok) {
      const data = (await res.json()) as { authorized?: boolean };
      if (data.authorized) {
        renderApp();
        return;
      }
    }
    render(<Unauthorized />);
  } catch {
    // BFF unreachable → treat as unauthorized (fail closed).
    render(<Unauthorized />);
  }
}

start();
