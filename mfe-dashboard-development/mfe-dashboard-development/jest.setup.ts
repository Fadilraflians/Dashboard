// Extends Jest's expect() with DOM matchers (toBeInTheDocument, etc.)
import "@testing-library/jest-dom";

// Build-time constant injected by webpack DefinePlugin in the real build.
// Define it on globalThis so source modules that read the bare `__APP_KEY__`
// identifier (e.g. getApiUrl) resolve it under test instead of throwing.
(globalThis as unknown as { __APP_KEY__: string }).__APP_KEY__ = "dashboardBok";
