import fs from "fs";
import path from "path";
import { envSchema, ENV_TYPES } from "./env-schema.js";

/**
 * Parse a .env-style file into a Map of key -> { value, lines: number[] }.
 * Handles simple KEY=VALUE lines and skips comments/blank lines.
 */
function parseEnvFile(filePath) {
  const result = new Map();

  if (!fs.existsSync(filePath)) {
    return result;
  }

  const content = fs.readFileSync(filePath, "utf-8");
  const lines = content.split(/\r?\n/);

  lines.forEach((rawLine, index) => {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) return;

    const eqIndex = line.indexOf("=");
    if (eqIndex === -1) return;

    const key = line.slice(0, eqIndex).trim();
    const value = line.slice(eqIndex + 1).trim();

    if (!key) return;

    if (result.has(key)) {
      result.get(key).lines.push(index + 1);
    } else {
      result.set(key, { value, lines: [index + 1] });
    }
  });

  return result;
}

function stripQuotes(value) {
  if (!value) return value;
  const first = value[0];
  const last = value[value.length - 1];
  if ((first === '"' && last === '"') || (first === "'" && last === "'")) {
    return value.slice(1, -1);
  }
  return value;
}

function resolvePattern(rule) {
  if (rule.pattern) return { pattern: rule.pattern, label: "custom pattern" };
  if (rule.type && ENV_TYPES[rule.type]) return ENV_TYPES[rule.type];
  return null;
}

/**
 * Warning-only env validation. Never throws — prints grouped console warnings.
 */
export function validateEnv() {
  const cwd = process.cwd();
  const envFile = parseEnvFile(path.join(cwd, ".env"));
  const exampleFile = parseEnvFile(path.join(cwd, ".env.example"));

  const warnings = [];

  // (1) Keys present in .env but missing from .env.example
  for (const key of envFile.keys()) {
    if (key.startsWith("npm_") || key.startsWith("__")) continue;
    if (!exampleFile.has(key)) {
      warnings.push(`[missing-from-example] "${key}" is set but not documented in .env.example`);
    }
  }

  // (2) Keys in .env.example but not set in the environment
  for (const key of exampleFile.keys()) {
    if (!(key in process.env) && !envFile.has(key)) {
      warnings.push(`[missing-value] "${key}" is documented in .env.example but has no value`);
    }
  }

  // (3) Schema required-but-missing + (4) format validation
  for (const [key, rule] of Object.entries(envSchema)) {
    const value = process.env[key] ?? envFile.get(key)?.value;

    if (rule.required && (value === undefined || value === "")) {
      warnings.push(`[required-missing] "${key}" is required (${rule.description ?? ""})`);
      continue;
    }

    if (value === undefined || value === "") continue;

    const resolved = resolvePattern(rule);
    if (resolved && !resolved.pattern.test(stripQuotes(value))) {
      warnings.push(`[format] "${key}" does not match expected type: ${resolved.label}`);
    }
  }

  // (5) Duplicate declarations
  for (const [key, meta] of envFile.entries()) {
    if (meta.lines.length > 1) {
      warnings.push(`[duplicate] "${key}" declared ${meta.lines.length} times (lines ${meta.lines.join(", ")})`);
    }
  }

  if (warnings.length > 0) {
    console.warn("\n============================================================");
    console.warn(" ENV VALIDATION WARNINGS (non-blocking)");
    console.warn("============================================================");
    warnings.forEach((w) => console.warn(` - ${w}`));
    console.warn("============================================================\n");
  } else {
    console.log("[env] Environment validation passed.");
  }

  return warnings;
}
