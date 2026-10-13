const path = require("node:path");
const { ModuleFederationPlugin } = require("webpack").container;
const HtmlWebpackPlugin = require("html-webpack-plugin");
const { dependencies } = require("./package.json");
require("dotenv").config();

// Shared UI remote. Scope name must be a valid JS identifier (no dashes) and
// must match the consumers' remote key (mfe-a/mfe-b webpack `remotes`).
// HARDCODED (static identity) — never changes per environment.
const SCOPE = "sharedUi";

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
  // so bundles are much larger and would always trip the budget — a dev-only
  // false alarm. The prod budget still catches real bloat.
  performance: {
    hints: isProduction ? "warning" : false,
    // Ignore large vendor fonts/images. The JS/CSS budget accommodates the
    // known React + PrimeReact vendor bundle (hashed + immutably cached). The
    // hint still fires on genuinely unexpected JS/CSS bloat beyond that.
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
      name: SCOPE,
      filename: "remoteEntry.js",
      exposes: {
        // Standalone card components — each self-contained (own icon, color,
        // format, label). The consuming MFE renders them inside its own React
        // tree, so React MUST be shared (singleton) between remote + consumer.
        "./TotalPendapatanCard":
          "./src/components/TotalPendapatanCard/TotalPendapatanCard.tsx",
        "./TransaksiCard": "./src/components/TransaksiCard/TransaksiCard.tsx",
        "./MetricCardWidget": "./src/components/MetricCardWidget/MetricCardWidget.tsx",
        "./BarChartWidget": "./src/components/BarChartWidget/BarChartWidget.tsx",
        "./LineChartWidget": "./src/components/LineChartWidget/LineChartWidget.tsx",
        "./AreaChartWidget": "./src/components/AreaChartWidget/AreaChartWidget.tsx",
        "./PieChartWidget": "./src/components/PieChartWidget/PieChartWidget.tsx",
        "./DoughnutChartWidget": "./src/components/DoughnutChartWidget/DoughnutChartWidget.tsx",
        "./ScatterChartWidget": "./src/components/ScatterChartWidget/ScatterChartWidget.tsx",
        "./TableWidget": "./src/components/TableWidget/TableWidget.tsx",
        "./theme.css": "./src/styles/theme.css",
        // Expose react-dom/client so the shell (Next.js) can call createRoot
        // from sharedUi's own bundled react-dom — giving DOM-isolated rendering
        // that prevents the "Invalid hook call / two React copies" error.
        "./reactdom": "./src/remoteReactDom.ts",
      },
      shared: {
        // eager:true — bundle React directly into sharedUi's entry chunk.
        // This guarantees sharedUi ALWAYS uses its own React instance
        // regardless of which share scope is passed to container.init().
        // Without eager, sharedUi defers to the consumer's share scope and
        // can end up with a different React than its own react-dom/recharts,
        // causing "Cannot read properties of null (reading 'useContext')".
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
  ],
  devServer: {
    port: process.env.SHARED_PORT || 9000,
    historyApiFallback: true,
    hot: true,
    // webpack-dev-server v5 is strict about the Host header and rejects
    // cross-origin requests with 403 Forbidden by default. The MFEs load this
    // remoteEntry.js cross-origin (from :3001/:3002), so allow all hosts and
    // send permissive CORS headers for the dev remote.
    allowedHosts: "all",
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
    // Tell the HMR WebSocket client the EXACT URL to connect to.
    // Without this, when sharedUi's bundle runs inside the shell page
    // (port 3000) the HMR client connects to ws://localhost:3000/ws —
    // that connection fails, webpack-dev-server throws a "Script error"
    // into window.onerror, and React's global error handler catches it,
    // producing the red "Uncaught runtime errors" overlay in the shell.
    client: {
      webSocketURL: {
        hostname: "localhost",
        pathname: "/ws",
        port: process.env.SHARED_PORT || 9000,
        protocol: "ws",
      },
      // Suppress noisy "{}" connection-status log at error level.
      logging: "warn",
      // Do not bubble webpack-dev-server runtime errors into the host
      // page (Next.js shell) — they have no meaning there.
      overlay: {
        runtimeErrors: false,
      },
    },
  },
  };
};

module.exports = buildConfig;
