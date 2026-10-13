import "./env-config.js";

/** @type {import('next').NextConfig} */

export const customNextConfig = {
  experimental: {
    optimizePackageImports: ["primeicons", "primereact"],
  },
  compiler: {
    removeConsole: process.env.NODE_ENV !== "development",
  },
  serverExternalPackages: ["winston", "winston-daily-rotate-file"],
  reactStrictMode: false,
  output:
    process.env.NEXT_OUTPUT_STANDALONE === "true" ||
    process.env.CI ||
    process.platform !== "win32"
      ? "standalone"
      : undefined,
  productionBrowserSourceMaps: false,
  typescript: {
    ignoreBuildErrors: false,
  },
  poweredByHeader: false,
  reactProductionProfiling: false,
  devIndicators: false,
};
