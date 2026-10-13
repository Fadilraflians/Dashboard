const path = require("node:path");
const webpack = require("webpack");
const { ModuleFederationPlugin } = require("webpack").container;
const HtmlWebpackPlugin = require("html-webpack-plugin");
// Load this project's own .env (by absolute path, not CWD) so the build reads
// the right values no matter which directory the build command runs from.
require("dotenv").config({ path: path.resolve(__dirname, ".env") });

// Module Federation container name (scope). This is the MFE's STATIC identity
// HARDCODED (static identity). The MF container name must match the shell's
// MFE_DASHBOARDBOK_SCOPE. Hardcoded (not from env) because it never changes
// per environment and because the CI build has no env — reading it from env
// produced the wrong container name ("templateMfe" / "Container not found").
const MFE_SCOPE = "dashboardBok";

// Shared UI remote. Scope is HARDCODED (static, must match rnd-template-shared).
// The URL is resolved at RUNTIME in the browser from window.__MFE_RUNTIME__
// (populated by the BFF /api/runtime-config in standalone mode, or by the shell
// via mount() props). Nothing about the shared location is baked at build time.
const SHARED_SCOPE = "sharedUi";

const { dependencies } = require("./package.json");

const buildConfig = function buildConfig(_env, argv) {
  const isProduction = (argv && argv.mode) === "production";
  return {
  entry: "./src/index.tsx",
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "[name].[contenthash].js",
    // "auto": the bundle detects its own origin at runtime (from where
    // remoteEntry.js is loaded), so no build-time URL is baked in and it works
    // behind any reverse proxy / domain without a rebuild.
    publicPath: "auto",
    clean: true,
  },
  // Asset-size hint only in production. In development webpack does not minify,
  // so bundles are much larger (e.g. react-dom ~1.1 MiB, vendor chunk ~3.5 MiB)
  // and would always trip the budget — a dev-only false alarm. Ignore large
  // vendor fonts/images either way; the prod budget still catches real bloat.
  performance: {
    hints: isProduction ? "warning" : false,
    // Ignore large vendor fonts/images (PrimeIcons woff2, SVGs). The JS/CSS
    // budget accommodates the known React + PrimeReact vendor bundle
    // (react-dom ~611 KiB + primereact datatable ~607 KiB in one hashed,
    // immutably-cached chunk ≈ 1.33 MiB). Splitting these is deferred to avoid
    // destabilising the Module Federation chunk graph; the hint still fires on
    // genuinely unexpected JS/CSS bloat beyond this known vendor footprint.
    assetFilter: (assetFilename) =>
      !/\.(woff2?|ttf|eot|svg|png|jpe?g|gif|webp)$/.test(assetFilename),
    maxAssetSize: 1.5 * 1024 * 1024,
    maxEntrypointSize: 1.5 * 1024 * 1024,
  },
  resolve: {
    extensions: [".tsx", ".ts", ".js"],
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: { loader: "ts-loader", options: { transpileOnly: true } },
        exclude: /node_modules/,
      },
      {
        test: /\.module\.css$/,
        use: [
          "style-loader",
          {
            loader: "css-loader",
            options: {
              // css-loader v7 defaults to namedExport:true / esModule:true,
              // which removes the default export and makes
              // `import styles from "./x.module.css"` resolve to undefined
              // (crashing on styles.container). Keep the classic default
              // export so the `import styles from` pattern works.
              esModule: false,
              modules: {
                namedExport: false,
                exportLocalsConvention: "asIs",
                localIdentName: "[name]__[local]--[hash:base64:5]",
              },
            },
          },
        ],
      },
      {
        test: /\.css$/,
        exclude: /\.module\.css$/,
        use: ["style-loader", "css-loader"],
      },
      {
        test: /\.(png|jpg|jpeg|svg|gif|webp)$/i,
        type: "asset/resource",
      },
    ],
  },
  plugins: [
    new ModuleFederationPlugin({
      name: MFE_SCOPE,
      filename: "remoteEntry.js",
      exposes: {
        // Expose a framework-agnostic mount/unmount API instead of a React
        // component. The MFE renders with its OWN React root into a DOM node
        // the shell provides, so the shell's React (Next.js) and the MFE's
        // React never share a reconciler — avoiding the two-React collision.
        "./mount": "./src/app/mount.tsx",
      },
      // Consume shared UI building blocks (cards, theme) from the shared
      // remote. Both this MFE and the shared remote are webpack hosts, so
      // react/react-dom are shared as singletons — one React instance across
      // this MFE and the shared components it renders.
      //
      // Promise-based ("dynamic") remote: instead of the static `scope@url`
      // string (whose failed remoteEntry load throws an UNCATCHABLE
      // ScriptExternalLoadError that surfaces as a global unhandled rejection /
      // dev overlay), we load the remoteEntry ourselves. If the shared remote
      // is DOWN we resolve a STUB container whose get() RESOLVES a tiny
      // fallback component (never rejects) — so `import("sharedUi/X")` always
      // succeeds, no promise rejection is ever observable by the global
      // unhandledrejection handler, and the card renders a graceful fallback.
      remotes: {
        [SHARED_SCOPE]: `promise new Promise(function (resolve) {
          var scope = ${JSON.stringify(SHARED_SCOPE)};
          // Resolve the shared remoteEntry URL at RUNTIME from the global set
          // by the BFF /runtime-config (standalone) or the shell (mount props).
          var rt = (typeof window !== "undefined" && window.__MFE_RUNTIME__) || {};
          var url = rt.sharedUrl || "http://localhost:9000/remoteEntry.js";
          function stub(reason) {
            if (typeof console !== "undefined" && console.warn) {
              console.warn("[MFE] shared remote '" + scope + "' unavailable: " + reason);
            }
            return {
              init: function () {},
              get: function () {
                // RESOLVE (never reject) a module whose default is a sentinel
                // (__unavailable__: true). The consumer's remoteCard() detects
                // the sentinel and swaps in the app-level fallback card. No
                // promise rejection is ever observable -> no dev overlay.
                return Promise.resolve(function () {
                  return { default: { __unavailable__: true, reason: reason } };
                });
              },
            };
          }
          var el = document.createElement("script");
          el.src = url;
          el.type = "text/javascript";
          el.async = true;
          el.onload = function () {
            var container = window[scope];
            if (container) resolve(container);
            else resolve(stub("container not found"));
            el.parentNode && el.parentNode.removeChild(el);
          };
          el.onerror = function () {
            resolve(stub("remoteEntry failed to load"));
            el.parentNode && el.parentNode.removeChild(el);
          };
          document.head.appendChild(el);
        })`,
      },
      shared: {
        // eager:true — bundle React into this MFE directly. The exposed
        // `./mount` imports React synchronously, and the Next.js (Turbopack)
        // shell cannot participate in webpack sharing (it inits the container
        // with an empty share scope). Without eager, resolving the shared
        // singleton against that empty scope throws
        // "Cannot read properties of undefined (reading 'global')".
        // Eager React still registers as the singleton in the default scope,
        // so sharedUi (loaded by this MFE) reuses this same React instance.
        react: {
          singleton: true,
          eager: true,
          requiredVersion: dependencies.react,
        },
        "react-dom": {
          singleton: true,
          eager: true,
          requiredVersion: dependencies["react-dom"],
        },
      },
    }),
    new HtmlWebpackPlugin({
      template: "./public/index.html",
    }),
    // Build-time constants for the browser bundle.
    new webpack.DefinePlugin({
      // APP_KEY used to build same-origin BFF proxy paths (/mfe-api/<APP_KEY>/...).
      // Static (hardcoded container name) so it is safe to bake at build time.
      // NOTE: the shell URL is NO LONGER baked here — it is resolved at runtime
      // via window.__MFE_RUNTIME__ (see src/lib/runtimeConfig.ts).
      __APP_KEY__: JSON.stringify(MFE_SCOPE),
    }),
  ],
  devServer: {
    port: process.env.MFE_PORT || 3001,
    historyApiFallback: true,
    hot: true,
    // Tell the HMR client the EXACT WebSocket URL to use.
    // Without this, when the MFE bundle runs inside the shell (port 3000),
    // the HMR client tries to open a WebSocket to localhost:3000 instead of
    // localhost:3001 — the connection fails and throws a "Script error" that
    // React's error boundary catches, producing the red overlay.
    client: {
      webSocketURL: {
        hostname: "localhost",
        pathname: "/ws",
        port: process.env.MFE_PORT || 3001,
        protocol: "ws",
      },
      // Suppress the "webpack-dev-server {} " console spam that comes from
      // WDS posting its connection status as an error-level log entry.
      logging: "warn",
      overlay: {
        // Only show actual build errors in the overlay, not runtime errors
        // from React (those already have their own error boundary UI).
        runtimeErrors: false,
      },
    },
    headers: { "Access-Control-Allow-Origin": "*" },
    proxy: [
      {
        // Standalone dev: the browser calls /mfe-api/<APP_KEY>/<path>; forward
        // to this MFE's BFF as /api/<path> (strip the /mfe-api/<APP_KEY> prefix),
        // mirroring the shell's /mfe-api proxy so both modes behave the same.
        context: ["/mfe-api"],
        target: process.env.API_TARGET || "http://localhost:3101",
        changeOrigin: true,
        pathRewrite: (reqPath) =>
          reqPath.replace(new RegExp(`^/mfe-api/${MFE_SCOPE}`), "/api"),
      },
    ],
  },
  };
};

module.exports = buildConfig;
