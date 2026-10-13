import nextJest from "next/jest.js";

// next/jest wires up SWC transform (TS/JSX), CSS-module stubs, path aliases
// (@/*), and env loading automatically — matching how the app actually builds.
const createJestConfig = nextJest({ dir: "./" });

/** @type {import('jest').Config} */
const config = {
  testEnvironment: "jsdom",
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },
  // Only run our own tests, never node_modules or build output.
  testPathIgnorePatterns: ["/node_modules/", "/.next/", "/dist/"],
  collectCoverageFrom: [
    "src/**/*.{ts,tsx}",
    "!src/**/*.d.ts",
    "!src/types/**",
  ],
};

export default createJestConfig(config);
