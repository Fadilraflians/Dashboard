/**
 * Webpack Module Federation runtime globals.
 *
 * The shell is a Next.js app (not a webpack-MF build), so these globals are
 * injected at runtime by the first remote's `remoteEntry.js`. We declare them
 * here so the loader code type-checks without pulling in webpack types.
 */
// These may be undefined in a non-webpack host (e.g. this Next.js shell).
// Declared as optional-ish vars so `typeof x === "function"` guards are valid.
declare var __webpack_init_sharing__:
  | ((scope: string) => Promise<void>)
  | undefined;
declare var __webpack_share_scopes__:
  | {
      default: unknown;
      [key: string]: unknown;
    }
  | undefined;

interface MfeContainer {
  init: (shareScope: unknown) => void | Promise<void>;
  get: (module: string) => Promise<() => { default?: unknown; [k: string]: unknown }>;
}

interface Window {
  [scope: string]: unknown;
}
